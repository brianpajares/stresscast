import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTestEnv } from "../helpers/env";
import { COUNTRIES, DEGREE_RESPONSES, FREQUENCY_RESPONSES, ITEM_KEYS, ITEM_SCALE, type AssessmentInput } from "@/engine/types";
import {
  decodeInputs,
  encodeInputs,
  issueStatelessToken,
  issueStoredToken,
  openStatelessToken,
  tokenKind,
  verificationId,
  verifyStoredToken,
} from "@/lib/server/tokens";

const RID = "0b7f0f1e-5f55-4c53-b5f5-2a6a2c1d9e11";

beforeEach(() => useTestEnv());
afterEach(() => vi.unstubAllEnvs());

describe("AT-11 · token privado almacenado (v1)", () => {
  it("es largo, no predecible y distinto en cada emisión", () => {
    const a = issueStoredToken(RID);
    const b = issueStoredToken(RID);
    expect(a.token.length).toBeGreaterThanOrEqual(32);
    expect(a.token).not.toBe(b.token);
    expect(tokenKind(a.token)).toBe("stored");
  });

  it("verifica un token válido y rechaza manipulado, de otra solicitud o hash distinto", () => {
    const t = issueStoredToken(RID);
    const stored = { hash: t.hash, expiresAt: t.expiresAt };
    expect(verifyStoredToken(t.token, RID, stored)).toBe("ok");
    expect(verifyStoredToken(`${t.token}x`, RID, stored)).toBe("invalid");
    expect(verifyStoredToken(t.token.replace(/.$/, (c) => (c === "A" ? "B" : "A")), RID, stored)).toBe("invalid");
    expect(verifyStoredToken(t.token, "11111111-1111-4111-8111-111111111111", stored)).toBe("invalid");
    expect(verifyStoredToken(t.token, RID, { hash: "0".repeat(64), expiresAt: t.expiresAt })).toBe("invalid");
    expect(verifyStoredToken("v1.short.x", RID, stored)).toBe("invalid");
  });

  it("expira", () => {
    const t = issueStoredToken(RID, new Date("2026-01-01T00:00:00Z"));
    expect(verifyStoredToken(t.token, RID, { hash: t.hash, expiresAt: t.expiresAt }, new Date("2026-03-01T00:00:00Z"))).toBe("expired");
  });

  it("una rotación invalida el enlace anterior (solo se guarda el hash vigente)", () => {
    const old = issueStoredToken(RID);
    const fresh = issueStoredToken(RID);
    expect(verifyStoredToken(old.token, RID, { hash: fresh.hash, expiresAt: fresh.expiresAt })).toBe("invalid");
  });
});

describe("token stateless (s1) para el modo sin base de datos", () => {
  const inputs: AssessmentInput = {
    country: "BR",
    emotionally_exhausting: "high",
    burned_out_due_work: "low",
    work_frustrates: "very_high",
    worn_out_end_day: "often",
    exhausted_morning: "never",
    every_working_hour_tiring: "sometimes",
    energy_family_friends: "always",
  };

  it("cifra: la URL no contiene país, respuestas ni score en claro", () => {
    const t = issueStatelessToken({ r: RID, l: "pt", a: encodeInputs(inputs), m: "1.0.0" });
    // El payload en claro (entradas codificadas, ids, "score") no aparece ni en la URL ni en los bytes decodificados.
    const raw = Buffer.from(t.token.slice(3), "base64url").toString("latin1");
    for (const needle of [encodeInputs(inputs), RID, "very_high", "score", "\"a\":"]) {
      expect(t.token).not.toContain(needle);
      expect(raw).not.toContain(needle);
    }
    expect(tokenKind(t.token)).toBe("stateless");
  });

  it("round-trip exacto y atado al id de solicitud (AAD)", () => {
    const t = issueStatelessToken({ r: RID, l: "pt", a: encodeInputs(inputs), m: "1.0.0" });
    const ok = openStatelessToken(t.token, RID);
    expect(ok.status).toBe("ok");
    if (ok.status === "ok") expect(decodeInputs(ok.payload.a)).toEqual(inputs);
    expect(openStatelessToken(t.token, "11111111-1111-4111-8111-111111111111").status).toBe("invalid");
  });

  it("rechaza manipulación y expira", () => {
    const t = issueStatelessToken({ r: RID, l: "es", a: encodeInputs(inputs), m: "1.0.0" }, new Date("2026-01-01T00:00:00Z"));
    const tampered = `${t.token.slice(0, -3)}AAA`;
    expect(openStatelessToken(tampered, RID).status).toBe("invalid");
    expect(openStatelessToken(t.token, RID, new Date("2026-06-01T00:00:00Z")).status).toBe("expired");
    expect(openStatelessToken("s1.", RID).status).toBe("invalid");
  });

  it("encode/decode de inputs es biyectivo en todo el espacio (78.125 × 7 países muestreados)", () => {
    const scale = (k: (typeof ITEM_KEYS)[number]) => (ITEM_SCALE[k] === "degree" ? DEGREE_RESPONSES : FREQUENCY_RESPONSES);
    let n = 0;
    for (let a = 0; a < 5; a++)
      for (let b = 0; b < 5; b++)
        for (let c = 0; c < 5; c++) {
          const i: Record<string, string> = { country: COUNTRIES[(a + b + c) % 7] };
          ITEM_KEYS.forEach((k, idx) => (i[k] = scale(k)[[a, b, c, a, b, c, a][idx]]));
          expect(decodeInputs(encodeInputs(i as unknown as AssessmentInput))).toEqual(i);
          n++;
        }
    expect(n).toBe(125);
    expect(decodeInputs("ZZ0000000")).toBeNull();
    expect(decodeInputs("US00000009")).toBeNull();
  });
});

describe("ID de verificación", () => {
  it("formato SC-{modelo}-{YYYYMMDD}-{8}, determinista y sin PII", () => {
    const id = verificationId(RID, "1.0.0", "2026-10-06T12:00:00Z");
    expect(id).toMatch(/^SC-1\.0\.0-20261006-[A-HJ-NP-Z2-9]{8}$/);
    expect(verificationId(RID, "1.0.0", "2026-10-06T23:59:00Z")).toBe(id);
    expect(verificationId("11111111-1111-4111-8111-111111111111", "1.0.0", "2026-10-06T12:00:00Z")).not.toBe(id);
  });
});
