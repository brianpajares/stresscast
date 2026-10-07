-- StressCast · Supabase/Postgres schema
-- Ejecutar como migration. RLS deny-by-default para acceso cliente.
create extension if not exists pgcrypto;

create type report_request_status as enum (
  'received','preparing','ready','delivery_pending','delivered','delivery_failed','cancelled'
);
create type order_status as enum (
  'pending','paid','failed','refunded','cancelled'
);
create type email_status as enum (
  'queued','sent','delivered','bounced','failed'
);
create type consent_kind as enum (
  'report_delivery','marketing','research','owner_manual_fulfillment'
);

create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  locale text not null check (locale in ('es','en','pt')),
  country text not null check (country in ('US','GB','CA','AU','BR','MX','ES')),
  source text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_email_idx on leads (lower(email));
create index if not exists leads_created_at_idx on leads (created_at desc);

create table if not exists calculations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  inputs jsonb not null,
  result jsonb not null,
  app_version text not null,
  model_version text not null,
  data_version text not null,
  manifest_version text not null,
  created_at timestamptz not null default now(),
  delete_after timestamptz
);
create index if not exists calculations_lead_idx on calculations (lead_id);
create index if not exists calculations_delete_after_idx on calculations (delete_after);

create table if not exists report_requests (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  calculation_id uuid not null references calculations(id) on delete restrict,
  status report_request_status not null default 'received',
  monetization_mode text not null check (monetization_mode in ('validation','stripe')),
  locale text not null check (locale in ('es','en','pt')),
  report_token_hash text,
  report_token_expires_at timestamptz,
  idempotency_key text not null unique,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists report_requests_lead_idx on report_requests (lead_id);
create index if not exists report_requests_status_idx on report_requests (status);

create table if not exists consent_records (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  report_request_id uuid references report_requests(id) on delete cascade,
  kind consent_kind not null,
  granted boolean not null,
  policy_version text not null,
  copy_version text not null,
  locale text not null check (locale in ('es','en','pt')),
  granted_at timestamptz not null default now()
);
create index if not exists consent_records_lead_idx on consent_records (lead_id);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete restrict,
  report_request_id uuid references report_requests(id) on delete restrict,
  provider text not null default 'stripe',
  provider_checkout_session_id text unique,
  provider_payment_intent_id text unique,
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null,
  status order_status not null default 'pending',
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stripe_events (
  event_id text primary key,
  event_type text not null,
  payload_sha256 text not null,
  processed_at timestamptz not null default now(),
  result text not null
);

create table if not exists email_deliveries (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  report_request_id uuid references report_requests(id) on delete set null,
  recipient_kind text not null check (recipient_kind in ('user','owner')),
  provider_message_id text unique,
  template_key text not null,
  status email_status not null default 'queued',
  error_code text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists privacy_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  request_type text not null check (request_type in ('access','deletion','rectification')),
  status text not null default 'verification_pending',
  verification_token_hash text,
  verified_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table admin_users enable row level security;
alter table leads enable row level security;
alter table calculations enable row level security;
alter table report_requests enable row level security;
alter table consent_records enable row level security;
alter table orders enable row level security;
alter table stripe_events enable row level security;
alter table email_deliveries enable row level security;
alter table admin_actions enable row level security;
alter table privacy_requests enable row level security;

-- Admin puede consultar lo necesario desde sesión autenticada.
create policy admin_read_admin_users on admin_users
for select to authenticated
using (public.is_admin());

create policy admin_read_leads on leads
for select to authenticated
using (public.is_admin());

create policy admin_read_calculations on calculations
for select to authenticated
using (public.is_admin());

create policy admin_read_report_requests on report_requests
for select to authenticated
using (public.is_admin());

create policy admin_read_consents on consent_records
for select to authenticated
using (public.is_admin());

create policy admin_read_orders on orders
for select to authenticated
using (public.is_admin());

create policy admin_read_emails on email_deliveries
for select to authenticated
using (public.is_admin());

create policy admin_read_actions on admin_actions
for select to authenticated
using (public.is_admin());

create policy admin_insert_actions on admin_actions
for insert to authenticated
with check (public.is_admin() and admin_user_id = auth.uid());

create policy admin_read_privacy_requests on privacy_requests
for select to authenticated
using (public.is_admin());

-- No policies para anon: acceso directo queda denegado.
-- Route Handlers server-side usan SUPABASE_SERVICE_ROLE_KEY y deben aplicar authz/validación propia.

-- Helper para updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on leads;
create trigger leads_set_updated_at before update on leads
for each row execute function public.set_updated_at();

drop trigger if exists report_requests_set_updated_at on report_requests;
create trigger report_requests_set_updated_at before update on report_requests
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at before update on orders
for each row execute function public.set_updated_at();

drop trigger if exists email_deliveries_set_updated_at on email_deliveries;
create trigger email_deliveries_set_updated_at before update on email_deliveries
for each row execute function public.set_updated_at();

-- Retención: el job de aplicación debe purgar calculations.delete_after y datos asociados
-- conforme a la política final y obligaciones legales aplicables.
