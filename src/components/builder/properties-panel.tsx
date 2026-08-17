import {
  type Align,
  type Container,
  type ContainerLayout,
  type Cta,
  type FormField,
  type Lang,
  type LText,
  type PageElement,
  LAYOUT_LABEL,
  uid,
} from "@/lib/builder-types";
import {
  Field,
  Pill,
  Section,
  Segmented,
  SelectInput,
  SliderInput,
  TextArea,
  TextInput,
  Toggle,
} from "./controls";
import { LucideIcon } from "./renderer";

function LInput({
  value,
  lang,
  onChange,
  multiline,
}: {
  value: LText;
  lang: Lang;
  onChange: (v: LText) => void;
  multiline?: boolean;
}) {
  const v = value ?? { en: "", ar: "" };
  const Cmp = multiline ? TextArea : TextInput;
  return (
    <Cmp
      dir={lang === "ar" ? "rtl" : "ltr"}
      value={v[lang]}
      onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) =>
        onChange({ ...v, [lang]: e.target.value })
      }
    />
  );
}

const alignOptions: { value: Align; label: React.ReactNode }[] = [
  { value: "start", label: <LucideIcon name="AlignLeft" className="mx-auto size-3.5" /> },
  { value: "center", label: <LucideIcon name="AlignCenter" className="mx-auto size-3.5" /> },
  { value: "end", label: <LucideIcon name="AlignRight" className="mx-auto size-3.5" /> },
];

function CtaEditor({
  cta,
  lang,
  onChange,
}: {
  cta: Cta;
  lang: Lang;
  onChange: (c: Cta) => void;
}) {
  const set = (patch: Partial<Cta>) => onChange({ ...cta, ...patch });
  const destinationHint: Record<string, string> = {
    internal: "/ar/cars/toyota",
    external: "https://partner.com",
    scroll: "#lead-form",
    app: "q84sale://listing/123",
    search: "/ar/search?category=cars&make=toyota",
  };
  return (
    <>
      <Field label="Button label">
        <LInput value={cta.label} lang={lang} onChange={(v) => set({ label: v })} />
      </Field>
      <Field label="Action type">
        <SelectInput
          value={cta.action}
          onChange={(v) => set({ action: v as Cta["action"] })}
          options={[
            { value: "internal", label: "Internal 4Sale URL" },
            { value: "external", label: "External URL" },
            { value: "scroll", label: "Scroll to section / form" },
            { value: "app", label: "App deep link" },
            { value: "search", label: "Category / search results" },
          ]}
        />
      </Field>
      <Field label="Destination">
        <TextInput
          value={cta.destination}
          placeholder={destinationHint[cta.action]}
          onChange={(e) => set({ destination: e.target.value })}
        />
      </Field>
      <Field label="Tracking event name">
        <TextInput value={cta.event} onChange={(e) => set({ event: e.target.value })} />
      </Field>
      <Field label="Style">
        <Segmented
          value={cta.variant}
          onChange={(v) => set({ variant: v as Cta["variant"] })}
          options={[
            { value: "primary", label: "Primary" },
            { value: "secondary", label: "Soft" },
            { value: "inverse", label: "On blue" },
          ]}
        />
      </Field>
    </>
  );
}

function ElementEditor({
  element,
  lang,
  update,
}: {
  element: PageElement;
  lang: Lang;
  update: (patch: Record<string, unknown>) => void;
}) {
  const p = element.props as Record<string, unknown>;
  const g = <T,>(k: string) => p[k] as T;

  switch (element.type) {
    case "heading":
      return (
        <>
          <Field label="Content">
            <LInput value={g<LText>("text")} lang={lang} onChange={(v) => update({ text: v })} multiline />
          </Field>
          <Field label="Level">
            <Segmented
              value={g<string>("level")}
              onChange={(v) => update({ level: v })}
              options={[
                { value: "h1", label: "H1" },
                { value: "h2", label: "H2" },
                { value: "h3", label: "H3" },
              ]}
            />
          </Field>
          <Field label="Alignment">
            <Segmented value={g<Align>("align")} onChange={(v) => update({ align: v })} options={alignOptions} />
          </Field>
        </>
      );
    case "text":
      return (
        <>
          <Field label="Content">
            <LInput value={g<LText>("text")} lang={lang} onChange={(v) => update({ text: v })} multiline />
          </Field>
          <Field label="Alignment">
            <Segmented value={g<Align>("align")} onChange={(v) => update({ align: v })} options={alignOptions} />
          </Field>
        </>
      );
    case "image":
      return (
        <>
          <div className="rounded-xl border border-dashed border-border bg-neutral-surface p-4 text-center">
            <LucideIcon name="UploadCloud" className="mx-auto size-5 text-brand" />
            <p className="mt-1.5 text-xs font-medium">Upload image</p>
            <p className="text-[10px] text-muted-foreground">Prototype: asset upload is mocked</p>
          </div>
          <Field label="Image URL">
            <TextInput
              value={g<string>("src")}
              placeholder="https://…"
              onChange={(e) => update({ src: e.target.value })}
            />
          </Field>
          <Field label="Alt text (SEO)">
            <LInput value={g<LText>("alt")} lang={lang} onChange={(v) => update({ alt: v })} />
          </Field>
          <Field label="Height">
            <SliderInput value={g<number>("height")} min={120} max={640} step={20} onChange={(v) => update({ height: v })} />
          </Field>
          <Field label="Alignment">
            <Segmented value={g<Align>("align")} onChange={(v) => update({ align: v })} options={alignOptions} />
          </Field>
        </>
      );
    case "cards": {
      const items = g<{ icon: string; title: LText; body: LText }[]>("items") || [];
      const setItem = (i: number, patch: Partial<(typeof items)[number]>) =>
        update({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
      return (
        <>
          {items.map((it, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground">Card {i + 1}</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => update({ items: items.filter((_, idx) => idx !== i) })}
                >
                  <LucideIcon name="Trash2" className="size-3.5" />
                </button>
              </div>
              <TextInput value={it.icon} onChange={(e) => setItem(i, { icon: e.target.value })} placeholder="Lucide icon" />
              <LInput value={it.title} lang={lang} onChange={(v) => setItem(i, { title: v })} />
              <LInput value={it.body} lang={lang} onChange={(v) => setItem(i, { body: v })} multiline />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              update({
                items: [
                  ...items,
                  { icon: "BadgeCheck", title: { en: "New card", ar: "بطاقة جديدة" }, body: { en: "", ar: "" } },
                ],
              })
            }
            className="w-full rounded-lg border border-dashed border-border py-2 text-xs font-medium hover:border-brand hover:text-brand"
          >
            + Add card
          </button>
        </>
      );
    }
    case "icons": {
      const items = g<{ icon: string; label: LText }[]>("items") || [];
      return (
        <>
          {items.map((it, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border p-3">
              <TextInput
                value={it.icon}
                onChange={(e) =>
                  update({ items: items.map((x, idx) => (idx === i ? { ...x, icon: e.target.value } : x)) })
                }
              />
              <LInput
                value={it.label}
                lang={lang}
                onChange={(v) => update({ items: items.map((x, idx) => (idx === i ? { ...x, label: v } : x)) })}
              />
            </div>
          ))}
        </>
      );
    }
    case "cta":
      return (
        <>
          <CtaEditor
            cta={element.props as unknown as Cta}
            lang={lang}
            onChange={(c) => update({ ...c })}
          />
          <Field label="Alignment">
            <Segmented value={g<Align>("align")} onChange={(v) => update({ align: v })} options={alignOptions} />
          </Field>
        </>
      );
    case "ctaSection":
      return (
        <>
          <Field label="Title">
            <LInput value={g<LText>("title")} lang={lang} onChange={(v) => update({ title: v })} />
          </Field>
          <Field label="Subtitle">
            <LInput value={g<LText>("subtitle")} lang={lang} onChange={(v) => update({ subtitle: v })} multiline />
          </Field>
          <div className="rounded-xl bg-neutral-surface p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Banner CTA
            </p>
            <div className="space-y-3">
              <CtaEditor cta={g<Cta>("cta")} lang={lang} onChange={(c) => update({ cta: c })} />
            </div>
          </div>
        </>
      );
    case "steps": {
      const items = g<{ title: LText; body: LText }[]>("items") || [];
      const setItem = (i: number, patch: Partial<(typeof items)[number]>) =>
        update({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
      return (
        <>
          {items.map((it, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground">Step {i + 1}</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => update({ items: items.filter((_, idx) => idx !== i) })}
                >
                  <LucideIcon name="Trash2" className="size-3.5" />
                </button>
              </div>
              <LInput value={it.title} lang={lang} onChange={(v) => setItem(i, { title: v })} />
              <LInput value={it.body} lang={lang} onChange={(v) => setItem(i, { body: v })} multiline />
            </div>
          ))}
          <button
            type="button"
            onClick={() => update({ items: [...items, { title: { en: "New step", ar: "خطوة" }, body: { en: "", ar: "" } }] })}
            className="w-full rounded-lg border border-dashed border-border py-2 text-xs font-medium hover:border-brand hover:text-brand"
          >
            + Add step
          </button>
        </>
      );
    }
    case "faq": {
      const items = g<{ q: LText; a: LText }[]>("items") || [];
      const setItem = (i: number, patch: Partial<(typeof items)[number]>) =>
        update({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
      return (
        <>
          {items.map((it, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border p-3">
              <LInput value={it.q} lang={lang} onChange={(v) => setItem(i, { q: v })} />
              <LInput value={it.a} lang={lang} onChange={(v) => setItem(i, { a: v })} multiline />
            </div>
          ))}
          <button
            type="button"
            onClick={() => update({ items: [...items, { q: { en: "Question", ar: "سؤال" }, a: { en: "", ar: "" } }] })}
            className="w-full rounded-lg border border-dashed border-border py-2 text-xs font-medium hover:border-brand hover:text-brand"
          >
            + Add question
          </button>
        </>
      );
    }
    case "form": {
      const fields = g<FormField[]>("fields") || [];
      const setField = (i: number, patch: Partial<FormField>) =>
        update({ fields: fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) });
      return (
        <>
          <Field label="Form title">
            <LInput value={g<LText>("title")} lang={lang} onChange={(v) => update({ title: v })} />
          </Field>
          <Field label="Anchor ID (for scroll CTAs)">
            <TextInput value={g<string>("anchor")} onChange={(e) => update({ anchor: e.target.value })} />
          </Field>
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fields</p>
            {fields.map((f, i) => (
              <div key={f.id} className="space-y-2 rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground">Field {i + 1}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => update({ fields: fields.filter((_, idx) => idx !== i) })}
                  >
                    <LucideIcon name="Trash2" className="size-3.5" />
                  </button>
                </div>
                <LInput value={f.label} lang={lang} onChange={(v) => setField(i, { label: v })} />
                <SelectInput
                  value={f.type}
                  onChange={(v) => setField(i, { type: v as FormField["type"] })}
                  options={[
                    { value: "text", label: "Text" },
                    { value: "phone", label: "Phone" },
                    { value: "email", label: "Email" },
                    { value: "dropdown", label: "Dropdown" },
                    { value: "checkbox", label: "Checkbox" },
                  ]}
                />
                {f.type === "dropdown" && (
                  <TextInput
                    value={f.options ?? ""}
                    placeholder="Comma separated options"
                    onChange={(e) => setField(i, { options: e.target.value })}
                  />
                )}
                <Toggle label="Required" checked={f.required} onChange={(v) => setField(i, { required: v })} />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                update({
                  fields: [
                    ...fields,
                    { id: uid(), label: { en: "New field", ar: "حقل جديد" }, type: "text", required: false },
                  ],
                })
              }
              className="w-full rounded-lg border border-dashed border-border py-2 text-xs font-medium hover:border-brand hover:text-brand"
            >
              + Add field
            </button>
          </div>
          <Field label="Submit button label">
            <LInput value={g<LText>("submitLabel")} lang={lang} onChange={(v) => update({ submitLabel: v })} />
          </Field>
          <Field label="Success message">
            <LInput value={g<LText>("success")} lang={lang} onChange={(v) => update({ success: v })} multiline />
          </Field>
          <Field label="Redirect after submit (optional)">
            <TextInput
              value={g<string>("redirect")}
              placeholder="/ar/thank-you"
              onChange={(e) => update({ redirect: e.target.value })}
            />
          </Field>
        </>
      );
    }
    case "listings":
      return (
        <>
          <Pill tone="warn">API-dependent integration</Pill>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Live inventory requires the 4Sale listings API. The prototype renders mocked results.
          </p>
          <Field label="Block title">
            <LInput value={g<LText>("title")} lang={lang} onChange={(v) => update({ title: v })} />
          </Field>
          <Field label="Category">
            <SelectInput
              value={g<string>("category")}
              onChange={(v) => update({ category: v })}
              options={["Cars", "Real Estate", "Electronics", "Services", "Heavy Equipment"].map((c) => ({
                value: c,
                label: c,
              }))}
            />
          </Field>
          <Field label="Make">
            <TextInput value={g<string>("make")} onChange={(e) => update({ make: e.target.value })} />
          </Field>
          <Field label="Model">
            <TextInput value={g<string>("model")} onChange={(e) => update({ model: e.target.value })} />
          </Field>
          <Field label="Area">
            <TextInput value={g<string>("area")} onChange={(e) => update({ area: e.target.value })} />
          </Field>
          <Field label="Listings displayed">
            <SliderInput value={Number(g<number>("count"))} min={2} max={6} step={1} suffix="" onChange={(v) => update({ count: v })} />
          </Field>
        </>
      );
    case "spacer":
      return (
        <Field label="Height">
          <SliderInput value={g<number>("height")} min={8} max={160} step={8} onChange={(v) => update({ height: v })} />
        </Field>
      );
    case "video":
      return (
        <Field label="Caption">
          <LInput value={g<LText>("label")} lang={lang} onChange={(v) => update({ label: v })} />
        </Field>
      );
    default:
      return <p className="text-xs text-muted-foreground">This element has no options.</p>;
  }
}

export function PropertiesPanel({
  container,
  element,
  lang,
  updateContainer,
  updateElement,
  onDeleteElement,
  onMoveElement,
  onDuplicateContainer,
  onDeleteContainer,
  onMoveContainer,
}: {
  container: Container | undefined;
  element: PageElement | undefined;
  lang: Lang;
  updateContainer: (patch: Partial<Container>) => void;
  updateElement: (patch: Record<string, unknown>) => void;
  onDeleteElement: () => void;
  onMoveElement: (dir: -1 | 1) => void;
  onDuplicateContainer: () => void;
  onDeleteContainer: () => void;
  onMoveContainer: (dir: -1 | 1) => void;
}) {
  if (!container) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <LucideIcon name="MousePointerSquareDashed" className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">Nothing selected</p>
        <p className="text-xs text-muted-foreground">
          Click a container or element on the canvas to edit its properties.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {element ? "Element" : "Container"}
            </p>
            <h3 className="text-sm font-semibold capitalize">
              {element ? element.type.replace(/([A-Z])/g, " $1") : container.name}
            </h3>
          </div>
          <div className="flex gap-1">
            {element ? (
              <>
                <IconBtn icon="ArrowUp" onClick={() => onMoveElement(-1)} />
                <IconBtn icon="ArrowDown" onClick={() => onMoveElement(1)} />
                <IconBtn icon="Trash2" danger onClick={onDeleteElement} />
              </>
            ) : (
              <>
                <IconBtn icon="ArrowUp" onClick={() => onMoveContainer(-1)} />
                <IconBtn icon="ArrowDown" onClick={() => onMoveContainer(1)} />
                <IconBtn icon="Copy" onClick={onDuplicateContainer} />
                <IconBtn icon="Trash2" danger onClick={onDeleteContainer} />
              </>
            )}
          </div>
        </div>
      </div>

      {element ? (
        <Section title={`Content (${lang.toUpperCase()})`}>
          <ElementEditor element={element} lang={lang} update={updateElement} />
        </Section>
      ) : (
        <>
          <Section title="Layout">
            <Field label="Container name">
              <TextInput value={container.name} onChange={(e) => updateContainer({ name: e.target.value })} />
            </Field>
            <Field label="Column layout">
              <SelectInput
                value={container.layout}
                onChange={(v) => updateContainer({ layout: v as ContainerLayout })}
                options={(Object.keys(LAYOUT_LABEL) as ContainerLayout[]).map((k) => ({
                  value: k,
                  label: LAYOUT_LABEL[k],
                }))}
              />
            </Field>
            <Field label="Content width">
              <SelectInput
                value={container.contentWidth}
                onChange={(v) => updateContainer({ contentWidth: v as Container["contentWidth"] })}
                options={[
                  { value: "narrow", label: "Narrow" },
                  { value: "default", label: "Default" },
                  { value: "wide", label: "Wide" },
                  { value: "full", label: "Full bleed" },
                ]}
              />
            </Field>
            <Field label="Vertical alignment">
              <Segmented
                value={container.align}
                onChange={(v) => updateContainer({ align: v })}
                options={[
                  { value: "start", label: "Top" },
                  { value: "center", label: "Middle" },
                  { value: "end", label: "Bottom" },
                ]}
              />
            </Field>
          </Section>
          <Section title="Design">
            <Field label="Background">
              <Segmented
                value={container.background}
                onChange={(v) => updateContainer({ background: v })}
                options={[
                  { value: "white", label: "White" },
                  { value: "soft", label: "Light blue" },
                  { value: "gray", label: "Gray" },
                  { value: "brand", label: "Blue" },
                ]}
              />
            </Field>
            <Field label="Vertical padding">
              <SliderInput value={container.paddingY} onChange={(v) => updateContainer({ paddingY: v })} />
            </Field>
            <Field label="Column spacing">
              <SliderInput value={container.gap} max={80} onChange={(v) => updateContainer({ gap: v })} />
            </Field>
            <Field label="Border radius">
              <SliderInput value={container.radius} max={48} onChange={(v) => updateContainer({ radius: v })} />
            </Field>
            <div className="flex items-start gap-2 rounded-lg bg-brand-soft p-2.5 text-[11px] text-brand">
              <LucideIcon name="Smartphone" className="mt-0.5 size-3.5 shrink-0" />
              Columns stack automatically on mobile — responsive behaviour is enforced by the system.
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function IconBtn({
  icon,
  onClick,
  danger,
}: {
  icon: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-md border border-border p-1.5 text-muted-foreground transition hover:bg-neutral-surface " +
        (danger ? "hover:border-destructive hover:text-destructive" : "hover:text-brand")
      }
    >
      <LucideIcon name={icon} className="size-3.5" />
    </button>
  );
}
