import copy from "@spec/copy_i18n.json";

/**
 * Versiones registradas con cada consentimiento (FR-09): permiten reconstruir qué texto aceptó cada persona.
 * La política es un borrador hasta cerrar la revisión legal por mercado (gate de lanzamiento).
 */
export const POLICY_VERSION = "privacy-draft-2026-10-07";
export const COPY_VERSION = `copy-${copy.meta.version}`;
