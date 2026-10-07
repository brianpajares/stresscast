import { Document, Font, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReportView } from "@/lib/report/view";
import { INTER_WOFF_BASE64 } from "./fonts.generated";

/**
 * Informe PDF (ux/report_layout.md · 7 páginas, tema claro de impresión, márgenes ~18–20 mm,
 * cuerpo 10.5 pt). Consume el mismo `ReportView` que el informe web (FR-12/FR-13): mismos números,
 * versiones, ID de verificación y disclaimers. Sin email ni PII en páginas ni metadata.
 */
let fontsRegistered = false;
function registerFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: "Inter",
    fonts: ([400, 600, 700] as const).map((w) => ({
      src: `data:font/woff;base64,${INTER_WOFF_BASE64[w]}`,
      fontWeight: w,
    })),
  });
  Font.registerHyphenationCallback((word) => [word]); // sin cortes de palabra automáticos
  fontsRegistered = true;
}

const C = {
  primary: "#0F766E",
  text: "#0F172A",
  muted: "#475569",
  border: "#CBD5E1",
  surface: "#F1F5F9",
  improve: "#047857",
  worsen: "#B45309",
  ref: "#64748B",
  white: "#FFFFFF",
};

const s = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 10.5, color: C.text, paddingTop: 54, paddingBottom: 60, paddingHorizontal: 54, lineHeight: 1.45 },
  brand: { fontSize: 11, fontWeight: 700, color: C.primary, marginBottom: 14 },
  h1: { fontSize: 25, fontWeight: 700, lineHeight: 1.15, marginBottom: 6 },
  h2: { fontSize: 18, fontWeight: 700, marginBottom: 6 },
  h3: { fontSize: 12, fontWeight: 700, marginBottom: 3 },
  muted: { color: C.muted },
  small: { fontSize: 9, color: C.muted },
  card: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 14, marginBottom: 10 },
  surface: { backgroundColor: C.surface, borderRadius: 6, padding: 10, marginBottom: 8 },
  row: { flexDirection: "row" },
  bigScore: { fontSize: 64, fontWeight: 700, lineHeight: 1 },
  track: { height: 9, borderRadius: 5, backgroundColor: "#E2E8F0", position: "relative", marginTop: 16 },
  fill: { height: 9, borderRadius: 5, backgroundColor: C.primary },
  tick: { position: "absolute", top: -4, width: 1.5, height: 17, backgroundColor: C.ref },
  marker: { position: "absolute", top: -4, width: 17, height: 17, borderRadius: 9, backgroundColor: C.primary, borderWidth: 3, borderColor: C.white },
  badge: { alignSelf: "flex-start", borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingVertical: 2, paddingHorizontal: 7, fontSize: 8.5, fontWeight: 600, color: C.muted, marginBottom: 6 },
  footer: { position: "absolute", left: 54, right: 54, bottom: 28, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: C.muted, borderTopWidth: 0.75, borderTopColor: C.border, paddingTop: 6 },
  th: { fontWeight: 600, width: "42%" },
  li: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 10 },
});

function Bar({ value, color = C.primary, marker = false }: { value: number; color?: string; marker?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: `${pct}%`, backgroundColor: color }]} />
      <View style={[s.tick, { left: "50%" }]} />
      {marker ? <View style={[s.marker, { left: `${pct}%`, marginLeft: -8 }]} /> : null}
    </View>
  );
}

function Footer({ view, pageOf }: { view: ReportView; pageOf: (page: number, total: number) => string }) {
  return (
    <View style={s.footer} fixed>
      <Text>
        {view.modelVersionText} · {view.generatedOn}
      </Text>
      <Text>{view.verificationId}</Text>
      <Text render={({ pageNumber, totalPages }) => pageOf(pageNumber, totalPages)} />
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((t) => (
        <View key={t} style={s.li} wrap={false}>
          <Text style={s.bullet}>•</Text>
          <Text style={{ flex: 1 }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

interface Props {
  view: ReportView;
  lang: string;
  documentTitle: string;
  pageOf: (page: number, total: number) => string;
}

export function ReportDocument({ view, lang, documentTitle, pageOf }: Props) {
  registerFonts();
  return (
    <Document
      title={documentTitle}
      author="StressCast"
      subject={view.coverTitle}
      keywords={view.verificationId}
      creator="StressCast"
      producer="StressCast"
      language={lang}
    >
      {/* 1 · Portada + resultado actual */}
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>StressCast</Text>
        <Text style={s.h1}>{view.coverTitle}</Text>
        <Text style={[s.muted, { marginBottom: 22 }]}>
          {view.generatedOn} · {view.modelVersionText}
        </Text>

        <View style={s.card}>
          <Text style={[s.h3, s.muted]}>{view.score.label}</Text>
          <View style={[s.row, { alignItems: "flex-end", marginTop: 4 }]}>
            <Text style={s.bigScore}>{view.score.value}</Text>
            <Text style={[s.muted, { fontSize: 14, marginLeft: 8, marginBottom: 8 }]}>{view.score.outOf}</Text>
          </View>
          <Text style={{ marginTop: 8, fontWeight: 600 }}>{view.score.bandText}</Text>
          <View style={{ paddingHorizontal: 8, paddingBottom: 18 }}>
            <Bar value={view.score.raw} marker />
            <View style={[s.row, { justifyContent: "space-between", marginTop: 8 }]}>
              <Text style={s.small}>0</Text>
              <Text style={[s.small, { fontWeight: 600 }]}>{view.score.referenceLabel}</Text>
              <Text style={s.small}>100</Text>
            </View>
          </View>
          <Text style={s.small}>{view.score.context}</Text>
        </View>

        <View style={[s.surface, { marginTop: 8 }]}>
          <Text style={s.small}>{view.disclaimer}</Text>
        </View>
        <Footer view={view} pageOf={pageOf} />
      </Page>

      {/* 2 · Qué compone tu score */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>{view.drivers.title}</Text>
        <Text style={[s.muted, { marginBottom: 12 }]}>{view.drivers.note}</Text>
        {view.drivers.items.map((d) => (
          <View key={d.key} style={s.card} wrap={false}>
            <View style={s.row}>
              <Text style={{ fontWeight: 700, color: C.primary, width: 18 }}>{d.rank}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.h3}>{d.name}</Text>
                <Text style={s.small}>{d.burdenText}</Text>
                <View style={{ marginTop: -6, marginBottom: 6 }}>
                  <Bar value={d.burden} />
                </View>
                {d.reverse ? <Text style={[s.small, { marginTop: 6 }]}>{view.drivers.reverseNote}</Text> : null}
                <View style={[s.surface, { marginTop: 8, marginBottom: 0 }]}>
                  <Text>
                    <Text style={{ fontWeight: 700 }}>{view.drivers.suggestionLabel}: </Text>
                    {d.suggestion}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}
        <Footer view={view} pageOf={pageOf} />
      </Page>

      {/* 3 · Escenarios condicionales */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>{view.scenarios.title}</Text>
        <Text style={{ fontWeight: 600 }}>{view.scenarios.subtitle}</Text>
        <Text style={[s.muted, { marginBottom: 12 }]}>{view.scenarios.note}</Text>
        <View style={[s.row, { marginBottom: 8 }]}>
          {view.scenarios.items.map((it, i) => (
            <View key={it.key} style={[s.card, { flex: 1, marginRight: i < 2 ? 8 : 0 }]} wrap={false}>
              <Text style={s.badge}>{view.scenarios.badge}</Text>
              <Text style={s.h3}>{it.label}</Text>
              <Text
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  color: it.key === "improve" ? C.improve : it.key === "worsen" ? C.worsen : C.primary,
                }}
              >
                {it.value}
              </Text>
              <Text style={s.small}>/ 100</Text>
            </View>
          ))}
        </View>
        <View style={s.surface}>
          <Text style={{ fontWeight: 700 }}>{view.scenarios.range}</Text>
          <Text style={[s.small, { marginTop: 4, fontWeight: 600 }]}>{view.scenarios.kTitle}</Text>
          <Text>{view.scenarios.kImprove}</Text>
          <Text>{view.scenarios.kWorsen}</Text>
        </View>
        <View style={s.surface}>
          <Text style={{ fontWeight: 700 }}>{view.scenarios.sensitivityTitle}</Text>
          <Text>{view.scenarios.sensitivityBody}</Text>
        </View>
        <Text style={[s.small, { marginTop: 6 }]}>{view.scenarios.footer}</Text>
        <Footer view={view} pageOf={pageOf} />
      </Page>

      {/* 4 · Contexto de referencia */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>{view.benchmark.title}</Text>
        <Text style={s.badge}>{view.benchmark.banner}</Text>
        <Text style={{ fontWeight: 700, marginBottom: 8 }}>{view.benchmark.delta}</Text>
        <Text style={{ marginBottom: 10 }}>{view.benchmark.body}</Text>
        <Text style={s.muted}>{view.benchmark.validity}</Text>
        <Footer view={view} pageOf={pageOf} />
      </Page>

      {/* 5 · Plan de 7 días */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>{view.plan.title}</Text>
        {view.plan.steps.map((st, i) => (
          <View key={st.title} style={s.card} wrap={false}>
            <Text style={s.h3}>
              {i + 1}. {st.title}
            </Text>
            <Text style={s.muted}>{st.body}</Text>
          </View>
        ))}
        {view.plan.notes.map((n) => (
          <View key={n.title} style={s.surface} wrap={false}>
            <Text style={{ fontWeight: 700 }}>{n.title}</Text>
            <Text>{n.body}</Text>
          </View>
        ))}
        <Text style={[s.muted, { marginTop: 6 }]}>{view.plan.support}</Text>
        <Footer view={view} pageOf={pageOf} />
      </Page>

      {/* 6 · Metodología y supuestos */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>{view.method.title}</Text>
        <View style={{ marginBottom: 12 }}>
          {view.method.rows.map((r) => (
            <View key={r.k} style={[s.row, { borderTopWidth: 0.75, borderTopColor: C.border, paddingVertical: 4 }]} wrap={false}>
              <Text style={s.th}>{r.k}</Text>
              <Text style={[s.muted, { flex: 1 }]}>{r.v}</Text>
            </View>
          ))}
        </View>
        <Text style={s.h3}>{view.method.formulaTitle}</Text>
        <Text style={{ marginBottom: 12 }}>{view.method.formula}</Text>
        <Text style={s.h3}>{view.method.limitationsTitle}</Text>
        <Bullets items={view.method.limitations} />
        <Footer view={view} pageOf={pageOf} />
      </Page>

      {/* 7 · Fuentes, privacidad y verificación */}
      <Page size="A4" style={s.page}>
        <Text style={s.h2}>{view.sourcesTitle}</Text>
        <View style={{ marginBottom: 12 }}>
          {view.sources.map((src) => (
            <View key={src.url} style={{ marginBottom: 5 }} wrap={false}>
              <Text>{src.label}</Text>
              <Link src={src.url} style={{ fontSize: 8.5, color: C.primary }}>
                {src.url}
              </Link>
            </View>
          ))}
        </View>
        <Text style={s.h3}>{view.privacy.title}</Text>
        <Text style={{ marginBottom: 10 }}>{view.privacy.body}</Text>
        <View style={s.surface}>
          <Text>{view.disclaimer}</Text>
        </View>
        <View style={[s.card, { marginTop: 8 }]} wrap={false}>
          <Text style={s.small}>{view.verificationLabel}</Text>
          <Text style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.5 }}>{view.verificationId}</Text>
          <Text style={[s.small, { marginTop: 4 }]}>{view.verificationNote}</Text>
        </View>
        <Footer view={view} pageOf={pageOf} />
      </Page>
    </Document>
  );
}
