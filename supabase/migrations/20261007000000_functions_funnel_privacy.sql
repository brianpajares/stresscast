-- StressCast · extensiones operativas sobre spec/db_schema.sql (sin modificarlo).
-- 1) contadores de funnel agregados (sin identificadores)
-- 2) create_report_request: transaccional + idempotente
-- 3) process_privacy_deletion / purge_expired_data: derechos del titular y retención
-- Todas las funciones SECURITY DEFINER son ejecutables SOLO por service_role (Route Handlers).

-- ---------------------------------------------------------------- funnel
create table if not exists funnel_counters (
  day date not null,
  event text not null,
  locale text not null default 'unknown',
  market text not null default 'unknown',
  count bigint not null default 0,
  primary key (day, event, locale, market)
);

alter table funnel_counters enable row level security;

drop policy if exists admin_read_funnel on funnel_counters;
create policy admin_read_funnel on funnel_counters
for select to authenticated
using (public.is_admin());

create or replace function public.increment_funnel(p_event text, p_locale text, p_market text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.funnel_counters (day, event, locale, market, count)
  values (
    (now() at time zone 'utc')::date,
    left(p_event, 64),
    coalesce(nullif(left(p_locale, 8), ''), 'unknown'),
    coalesce(nullif(left(p_market, 8), ''), 'unknown'),
    1
  )
  on conflict (day, event, locale, market)
  do update set count = public.funnel_counters.count + 1;
$$;

revoke all on function public.increment_funnel(text, text, text) from public, anon, authenticated;
grant execute on function public.increment_funnel(text, text, text) to service_role;

-- ------------------------------------------------ create_report_request
create or replace function public.create_report_request(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(p->>'email'));
  v_req uuid;
  v_lead uuid;
  v_calc uuid;
  v_status report_request_status;
  v_inputs jsonb;
  v_old_email text;
begin
  -- Replay idempotente.
  select rr.id, rr.lead_id, rr.calculation_id, rr.status, c.inputs, l.email
    into v_req, v_lead, v_calc, v_status, v_inputs, v_old_email
  from report_requests rr
  join leads l on l.id = rr.lead_id
  join calculations c on c.id = rr.calculation_id
  where rr.idempotency_key = p->>'idempotency_key';

  if found then
    return jsonb_build_object(
      'replay', true, 'request_id', v_req, 'lead_id', v_lead, 'calculation_id', v_calc, 'status', v_status,
      'same_payload', (lower(v_old_email) = v_email and v_inputs = (p->'inputs'))
    );
  end if;

  select id into v_lead from leads where lower(email) = v_email order by created_at asc limit 1;
  if v_lead is null then
    insert into leads (email, locale, country, source)
    values (v_email, p->>'locale', p->>'country', 'web')
    returning id into v_lead;
  else
    update leads set locale = p->>'locale', country = p->>'country' where id = v_lead;
  end if;

  insert into calculations (lead_id, inputs, result, app_version, model_version, data_version, manifest_version, delete_after)
  values (
    v_lead, p->'inputs', p->'result', p->>'app_version', p->>'model_version', p->>'data_version', p->>'manifest_version',
    nullif(p->>'delete_after', '')::timestamptz
  )
  returning id into v_calc;

  insert into report_requests (id, lead_id, calculation_id, status, monetization_mode, locale, report_token_hash, report_token_expires_at, idempotency_key)
  values (
    (p->>'request_id')::uuid, v_lead, v_calc, 'received', p->>'monetization_mode', p->>'locale',
    nullif(p->>'token_hash', ''), nullif(p->>'token_expires_at', '')::timestamptz, p->>'idempotency_key'
  )
  returning id, status into v_req, v_status;

  insert into consent_records (lead_id, report_request_id, kind, granted, policy_version, copy_version, locale)
  values
    (v_lead, v_req, 'report_delivery', true, p->>'policy_version', p->>'copy_version', p->>'locale'),
    (v_lead, v_req, 'marketing', coalesce((p->>'marketing_opt_in')::boolean, false), p->>'policy_version', p->>'copy_version', p->>'locale');

  if coalesce((p->>'owner_copy')::boolean, false) then
    insert into consent_records (lead_id, report_request_id, kind, granted, policy_version, copy_version, locale)
    values (v_lead, v_req, 'owner_manual_fulfillment', true, p->>'policy_version', p->>'copy_version', p->>'locale');
  end if;

  return jsonb_build_object(
    'replay', false, 'request_id', v_req, 'lead_id', v_lead, 'calculation_id', v_calc, 'status', v_status, 'same_payload', true
  );
exception
  when unique_violation then
    -- Carrera entre dos solicitudes con la misma Idempotency-Key.
    select rr.id, rr.lead_id, rr.calculation_id, rr.status, c.inputs, l.email
      into v_req, v_lead, v_calc, v_status, v_inputs, v_old_email
    from report_requests rr
    join leads l on l.id = rr.lead_id
    join calculations c on c.id = rr.calculation_id
    where rr.idempotency_key = p->>'idempotency_key';
    if found then
      return jsonb_build_object(
        'replay', true, 'request_id', v_req, 'lead_id', v_lead, 'calculation_id', v_calc, 'status', v_status,
        'same_payload', (lower(v_old_email) = v_email and v_inputs = (p->'inputs'))
      );
    end if;
    raise;
end;
$$;

revoke all on function public.create_report_request(jsonb) from public, anon, authenticated;
grant execute on function public.create_report_request(jsonb) to service_role;

-- --------------------------------------------- derechos del titular
-- Eliminación: borra payloads y solicitudes; si existen pedidos (retención legal de pagos) anonimiza el lead.
create or replace function public.process_privacy_deletion(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(p_email));
  v_leads uuid[];
  v_calcs uuid[];
  v_orders int;
  v_requests int := 0;
  v_calculations int := 0;
begin
  select coalesce(array_agg(id), '{}') into v_leads from leads where lower(email) = v_email;
  if cardinality(v_leads) = 0 then
    return jsonb_build_object('leads', 0, 'requests', 0, 'calculations', 0, 'anonymized', false);
  end if;

  select coalesce(array_agg(id), '{}') into v_calcs from calculations where lead_id = any(v_leads);
  select count(*) into v_orders from orders where lead_id = any(v_leads);

  -- Los payloads sensibles se redactan siempre.
  update calculations set inputs = '{}'::jsonb, result = '{}'::jsonb where id = any(v_calcs);

  with d as (
    delete from report_requests rr
    where rr.lead_id = any(v_leads)
      and not exists (select 1 from orders o where o.report_request_id = rr.id)
    returning 1
  ) select count(*) into v_requests from d;

  with d as (
    delete from calculations c
    where c.id = any(v_calcs)
      and not exists (select 1 from report_requests rr where rr.calculation_id = c.id)
    returning 1
  ) select count(*) into v_calculations from d;

  if v_orders > 0 then
    update leads set email = 'deleted+' || id::text || '@invalid.local', status = 'anonymized' where id = any(v_leads);
  else
    delete from leads where id = any(v_leads);
  end if;

  return jsonb_build_object(
    'leads', cardinality(v_leads), 'requests', v_requests, 'calculations', v_calculations, 'anonymized', v_orders > 0
  );
end;
$$;

revoke all on function public.process_privacy_deletion(text) from public, anon, authenticated;
grant execute on function public.process_privacy_deletion(text) to service_role;

-- Retención: purga payloads vencidos (calculations.delete_after) y leads huérfanos sin marketing opt-in.
create or replace function public.purge_expired_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requests int := 0;
  v_calculations int := 0;
  v_leads int := 0;
begin
  with d as (
    delete from report_requests rr
    where rr.calculation_id in (select id from calculations where delete_after is not null and delete_after < now())
      and not exists (select 1 from orders o where o.report_request_id = rr.id)
    returning 1
  ) select count(*) into v_requests from d;

  with d as (
    delete from calculations c
    where c.delete_after is not null and c.delete_after < now()
      and not exists (select 1 from report_requests rr where rr.calculation_id = c.id)
    returning 1
  ) select count(*) into v_calculations from d;

  with d as (
    delete from leads l
    where l.created_at < now() - interval '1 day'
      and not exists (select 1 from report_requests rr where rr.lead_id = l.id)
      and not exists (select 1 from orders o where o.lead_id = l.id)
      and not exists (select 1 from consent_records cr where cr.lead_id = l.id and cr.kind = 'marketing' and cr.granted)
    returning 1
  ) select count(*) into v_leads from d;

  return jsonb_build_object('requests', v_requests, 'calculations', v_calculations, 'leads', v_leads);
end;
$$;

revoke all on function public.purge_expired_data() from public, anon, authenticated;
grant execute on function public.purge_expired_data() to service_role;
