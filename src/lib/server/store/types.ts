import type { AssessmentInput, CalculationResult } from "@/engine/types";
import type { Locale } from "@/i18n/routing";

export type RequestStatus =
  | "received"
  | "preparing"
  | "ready"
  | "delivery_pending"
  | "delivered"
  | "delivery_failed"
  | "cancelled";

export type EmailStatus = "queued" | "sent" | "delivered" | "bounced" | "failed";
export type OrderStatus = "pending" | "paid" | "failed" | "refunded" | "cancelled";
export type PrivacyRequestType = "access" | "deletion" | "rectification";

export interface Versions {
  app: string;
  model: string;
  data: string;
  manifest: string;
}

export interface CreateRequestParams {
  requestId: string;
  idempotencyKey: string;
  email: string;
  locale: Locale;
  country: string;
  inputs: AssessmentInput;
  result: CalculationResult;
  marketingOptIn: boolean;
  /** Consentimiento de copia operativa al owner (solo MONETIZATION_MODE=validation). */
  ownerCopy: boolean;
  policyVersion: string;
  copyVersion: string;
  monetizationMode: "validation" | "stripe";
  versions: Versions;
  tokenHash: string;
  tokenExpiresAt: Date;
  deleteAfter: Date;
}

export interface CreateRequestOutcome {
  replay: boolean;
  samePayload: boolean;
  requestId: string;
  leadId: string;
  calculationId: string;
  status: RequestStatus;
}

export interface StoredReport {
  requestId: string;
  leadId: string;
  calculationId: string;
  locale: Locale;
  status: RequestStatus;
  monetizationMode: "validation" | "stripe";
  tokenHash: string | null;
  tokenExpiresAt: string | null;
  createdAt: string;
  inputs: AssessmentInput;
  result: CalculationResult;
  versions: Versions;
}

export interface DeliveryRecord {
  leadId: string | null;
  requestId: string | null;
  recipientKind: "user" | "owner";
  templateKey: string;
  status: EmailStatus;
  providerMessageId?: string | null;
  errorCode?: string | null;
  idempotencyKey: string;
}

export interface AdminLeadRow {
  id: string;
  email: string;
  status: string;
  created_at: string;
  last_delivery_status: string | null;
  locale: string;
  country: string;
  request_id: string | null;
}

export interface FunnelRow {
  day: string;
  event: string;
  locale: string;
  market: string;
  count: number;
}

export interface OrderRow {
  id: string;
  leadId: string;
  requestId: string | null;
  status: OrderStatus;
  amountMinor: number;
  currency: string;
  checkoutSessionId: string | null;
}

export interface PrivacyRequestRow {
  id: string;
  email: string;
  type: PrivacyRequestType;
  status: string;
  tokenHash: string | null;
}

export interface ExportedData {
  leads: Record<string, unknown>[];
  report_requests: Record<string, unknown>[];
  calculations: Record<string, unknown>[];
  consent_records: Record<string, unknown>[];
}

/** Persistencia de leads, cálculos, solicitudes, entregas, auditoría y pagos (spec/db_schema.sql). */
export interface ReportStore {
  readonly kind: "supabase" | "memory";

  createReportRequest(p: CreateRequestParams): Promise<CreateRequestOutcome>;
  getReport(requestId: string): Promise<StoredReport | null>;
  getLeadEmail(leadId: string): Promise<string | null>;
  setStatus(requestId: string, status: RequestStatus, errorCode?: string | null): Promise<void>;
  rotateToken(requestId: string, hash: string, expiresAt: Date): Promise<void>;
  recordDelivery(rec: DeliveryRecord): Promise<{ created: boolean }>;
  deliveryStatuses(requestId: string): Promise<Record<"user" | "owner", EmailStatus | null>>;

  listLeads(opts: { status?: string; cursor?: string; limit: number }): Promise<{ items: AdminLeadRow[]; nextCursor: string | null }>;
  latestRequestForLead(leadId: string): Promise<{ requestId: string; locale: Locale } | null>;
  logAdminAction(a: { adminUserId: string; action: string; targetType: string; targetId: string; metadata?: Record<string, unknown> }): Promise<void>;
  recentAdminActions(limit: number): Promise<{ action: string; target_type: string; target_id: string; created_at: string }[]>;

  incrementFunnel(event: string, locale: string, market: string): Promise<void>;
  funnelSince(isoDay: string): Promise<FunnelRow[]>;
  statusCounts(): Promise<Record<string, number>>;

  createPrivacyRequest(p: { email: string; type: PrivacyRequestType; tokenHash: string }): Promise<string>;
  getPrivacyRequest(id: string): Promise<PrivacyRequestRow | null>;
  completePrivacyRequest(id: string, verified: boolean): Promise<void>;
  exportData(email: string): Promise<ExportedData>;
  processDeletion(email: string): Promise<{ leads: number; requests: number; calculations: number; anonymized: boolean }>;
  purgeExpired(): Promise<{ requests: number; calculations: number; leads: number }>;

  recordStripeEvent(e: { eventId: string; eventType: string; payloadSha256: string; result: string }): Promise<{ duplicate: boolean }>;
  createOrder(o: {
    leadId: string;
    requestId: string | null;
    amountMinor: number;
    currency: string;
    idempotencyKey: string;
    checkoutSessionId: string | null;
  }): Promise<OrderRow>;
  setOrderSession(orderId: string, checkoutSessionId: string): Promise<void>;
  findOrderBySession(sessionId: string): Promise<OrderRow | null>;
  setOrderStatus(orderId: string, status: OrderStatus, paymentIntentId?: string | null): Promise<{ changed: boolean }>;
  getCalculationBundle(calculationId: string): Promise<{
    calculationId: string;
    leadId: string;
    email: string;
    requestId: string | null;
    locale: Locale;
    country: string;
  } | null>;
}
