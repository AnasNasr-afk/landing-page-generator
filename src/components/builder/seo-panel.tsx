import { type Lang, type LandingPage, type LText, t } from "@/lib/builder-types";
import { Field, Pill, Section, SelectInput, TextArea, TextInput, Toggle } from "./controls";
import { LucideIcon } from "./renderer";

const PENDING = [
  { title: "Arabic / English URL structure", note: "Sub-directory vs sub-domain vs parameter — not decided." },
  { title: "hreflang implementation", note: "Reciprocal AR/EN tags + x-default handling." },
  { title: "Canonical behaviour", note: "Self-canonical per language vs cross-language canonical." },
  { title: "Sitemap inclusion", note: "Auto-add published pages, exclude noindex." },
  { title: "Structured data / schema", note: "Which schema types are auto-generated per page type." },
  { title: "Crawlability & indexability", note: "robots.txt rules for builder-generated paths." },
  { title: "Rendering strategy", note: "SSR / static pre-render for landing pages." },
  { title: "Core Web Vitals", note: "Image optimisation, LCP budget per template." },
  { title: "Google Search Console", note: "Property, submission and monitoring ownership." },
  { title: "Structured content for AI search", note: "Answer blocks, entity markup, citation readiness." },
];

export function SeoPanel({
  page,
  lang,
  onChange,
}: {
  page: LandingPage;
  lang: Lang;
  onChange: (patch: Partial<LandingPage["seo"]>) => void;
}) {
  const seo = page.seo;
  const L = (v: LText, k: keyof typeof seo) => ({
    value: v[lang],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ [k]: { ...v, [lang]: e.target.value } } as Partial<typeof seo>),
    dir: lang === "ar" ? ("rtl" as const) : ("ltr" as const),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SEO &amp; AI Search</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Page-level search settings for <span className="font-medium">{page.name}</span> ·{" "}
            {lang === "ar" ? "Arabic version" : "English version"}
          </p>
        </div>
        <Pill tone="muted">Technical SEO is platform-managed</Pill>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-2xl border border-border bg-background">
          <Section title="Search basics">
            <Field label="SEO title">
              <TextInput {...L(seo.title, "title")} />
            </Field>
            <Field label="Meta description">
              <TextArea {...L(seo.description, "description")} />
            </Field>
            <Field label="URL slug">
              <TextInput value={seo.slug} onChange={(e) => onChange({ slug: e.target.value })} />
            </Field>
            <Field label="Target search query / topic">
              <TextInput {...L(seo.targetQuery, "targetQuery")} />
            </Field>
          </Section>
          <Section title="Indexing">
            <Toggle
              label="Allow search engines to index this page"
              checked={seo.index}
              onChange={(v) => onChange({ index: v })}
            />
            <Field label="Canonical override (optional)">
              <TextInput
                value={seo.canonical}
                placeholder="Leave empty to use platform default"
                onChange={(e) => onChange({ canonical: e.target.value })}
              />
            </Field>
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-[11px] text-amber-800">
              <LucideIcon name="AlertTriangle" className="mt-0.5 size-3.5 shrink-0" />
              Canonical + hreflang rules for AR/EN pairs are pending SEO validation.
            </div>
          </Section>
          <Section title="AI / Answer engine">
            <Field label="Direct factual answer">
              <TextArea {...L(seo.aiAnswer, "aiAnswer")} />
            </Field>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              A concise, factual summary answering the page&apos;s target query. Intended to support AI
              answer engines — <span className="font-medium">behaviour pending validation with the SEO
              specialist</span>; no ranking or citation is guaranteed.
            </p>
          </Section>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-background p-4">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Google result preview
            </h3>
            <div dir={lang === "ar" ? "rtl" : "ltr"} className="rounded-xl bg-neutral-surface p-4">
              <div className="text-xs text-neutral-600">
                q84sale.com › {lang} › {seo.slug || "slug"}
              </div>
              <div className="mt-1 line-clamp-2 text-lg leading-snug text-[#1a0dab]">
                {t(seo.title, lang) || "Page title"}
              </div>
              <p className="mt-1 line-clamp-3 text-sm text-neutral-600">
                {t(seo.description, lang) || "Meta description preview appears here."}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <Pill tone={seo.index ? "brand" : "warn"}>{seo.index ? "Indexable" : "Noindex"}</Pill>
              <Pill tone="muted">{t(seo.title, lang).length} / 60 title chars</Pill>
              <Pill tone="muted">{t(seo.description, lang).length} / 160 desc chars</Pill>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex items-center gap-2">
              <LucideIcon name="ShieldQuestion" className="size-4 text-amber-700" />
              <h3 className="text-sm font-semibold text-amber-900">Technical SEO — pending validation</h3>
            </div>
            <p className="mt-1 text-[11px] text-amber-800">
              Platform-level rules to be finalised with the SEO specialist and Engineering. Not editable
              by marketing users.
            </p>
            <ul className="mt-3 space-y-2">
              {PENDING.map((p) => (
                <li key={p.title} className="rounded-lg bg-background/70 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{p.title}</span>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      Pending
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{p.note}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageSettingsPanel({
  page,
  lang,
  setLang,
  onChange,
}: {
  page: LandingPage;
  lang: Lang;
  setLang: (l: Lang) => void;
  onChange: (patch: Partial<LandingPage>) => void;
}) {
  return (
    <div className="space-y-0">
      <Section title="Page settings">
        <Field label="Internal page name">
          <TextInput value={page.name} onChange={(e) => onChange({ name: e.target.value })} />
        </Field>
        <Field label="URL slug">
          <TextInput
            value={page.slug}
            onChange={(e) => onChange({ slug: e.target.value, seo: { ...page.seo, slug: e.target.value } })}
          />
        </Field>
        <Field label="Editing language">
          <SelectInput
            value={lang}
            onChange={(v) => setLang(v as Lang)}
            options={[
              { value: "en", label: "English (LTR)" },
              { value: "ar", label: "العربية (RTL)" },
            ]}
          />
        </Field>
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-[11px] text-amber-800">
          <LucideIcon name="Languages" className="mt-0.5 size-3.5 shrink-0" />
          Arabic and English are two versions of the same page entity. The public URL pattern for each
          language is pending SEO validation.
        </div>
        <Field label="State">
          <div className="flex items-center gap-2">
            <span
              className={
                "rounded-full px-3 py-1 text-xs font-semibold " +
                (page.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-neutral-surface text-muted-foreground")
              }
            >
              {page.status === "published" ? "Published" : "Draft"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              /{lang}/{page.slug}
            </span>
          </div>
        </Field>
      </Section>
    </div>
  );
}
