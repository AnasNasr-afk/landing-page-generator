import {
  type Align,
  type Container,
  type ContainerBg,
  type ContainerLayout,
  type Cta,
  type FormField,
  type Lang,
  type LText,
  type PageElement,
  type TextWeight,
  ICON_TONES,
  ICON_TONE_CLASS,
  type IconStyle,
  iconStyle,
  iconTone,
  iconsLayout,
  iconsSize,
  containerDirection,
  containerTracks,
  layoutLabel,
  textWeight,
  LAYOUT_LABEL,
  uid,
} from "@/lib/builder-types";
import { CTA_RADIUS_MAX, ctaAction, ctaRadius } from "@/lib/cta";
import { readCardCtas } from "@/lib/listings-api";
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
import { ctaVariant } from "@/lib/container-bg";
import { cn } from "@/lib/utils";
import { IconPicker } from "./icon-picker";
import { UiIcon as Icon } from "./ui-icon";
import { ListingsEditor } from "./listings-picker";

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

/**
 * Text colour picker shared by headings and paragraphs.
 *
 * Three palette choices, no free colour: text on a 4Sale page is either the
 * dark ink or the light ink, and `Auto` writes no colour at all so the
 * container's own text colour comes through — which keeps copy readable when
 * the background changes later. Switching away from a legacy custom colour
 * clears the stored hex so it cannot resurface.
 */
function TextColorField({
  tone,
  update,
}: {
  tone: string | undefined;
  update: (patch: Record<string, unknown>) => void;
}) {
  return (
    <Field label="Text color">
      <Segmented
        value={tone === "light" || tone === "dark" ? tone : "auto"}
        onChange={(v) => update({ tone: v, color: undefined })}
        options={[
          { value: "auto", label: "Auto" },
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ]}
      />
    </Field>
  );
}

const alignOptions: { value: Align; label: React.ReactNode }[] = [
  { value: "start", label: <Icon name="AlignLeft" className="mx-auto size-3.5" /> },
  { value: "center", label: <Icon name="AlignCenter" className="mx-auto size-3.5" /> },
  { value: "end", label: <Icon name="AlignRight" className="mx-auto size-3.5" /> },
];

/** Plain-language description of where a link goes, shown under the field. */
const ACTION_HINT: Record<Cta["action"], string> = {
  scroll: "Scrolls to a section on this page.",
  search: "Opens filtered search results on 4Sale.",
  internal: "Opens another page on q84sale.com.",
  external: "Opens another website in a new tab.",
  app: "Opens the 4Sale app, falling back to the website.",
};

function CtaEditor({ cta, lang, onChange }: { cta: Cta; lang: Lang; onChange: (c: Cta) => void }) {
  /*
   * The action is recomputed from the destination on every edit rather than
   * picked from a list. It still has to be stored — published pages carry it as
   * `data-fs-action` — but asking an editor to classify their own URL was both
   * a developer's question and a way for the two fields to contradict each
   * other.
   */
  const set = (patch: Partial<Cta>) => {
    const next = { ...cta, ...patch };
    onChange({ ...next, action: ctaAction(next.destination, cta.action) });
  };
  const action = ctaAction(cta.destination, cta.action);

  return (
    <>
      <Field label="Button label">
        <LInput value={cta.label} lang={lang} onChange={(v) => set({ label: v })} />
      </Field>
      {/*
        The same 4Sale icon set the page elements draw from, so a button and a
        feature list can carry the same glyph. "No icon" leads the grid — 238 of
        q84sale.com's own 333 buttons are text-only.
      */}
      <Field label="Symbol">
        <IconPicker value={cta.icon ?? "none"} onChange={(v) => set({ icon: v })} allowNone />
      </Field>
      <Field label="Corner radius">
        <SliderInput
          value={ctaRadius(cta.radius)}
          min={0}
          max={CTA_RADIUS_MAX}
          step={2}
          onChange={(v) => set({ radius: v })}
        />
      </Field>
      <Field label="Link">
        <TextInput
          value={cta.destination}
          placeholder="#lead-form  ·  /ar/cars/toyota  ·  https://…"
          onChange={(e) => set({ destination: e.target.value })}
        />
      </Field>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{ACTION_HINT[action]}</p>
      <Field label="Tracking event name">
        <TextInput value={cta.event} onChange={(e) => set({ event: e.target.value })} />
      </Field>
      {/*
        Three palette styles and no colour picker. Each already carries its own
        label colour, so there is nothing left for an editor to get wrong —
        and no way to ship a button that isn't 4Sale blue.
      */}
      <Field label="Style">
        <Segmented
          value={ctaVariant(cta.variant)}
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

/**
 * Icon colour controls, shared by the icon row and the cards block.
 *
 * Both draw a glyph in a chip, so both need the same three questions answered —
 * background treatment, then which palette ramp. Kept in one component so the
 * two blocks cannot drift into offering different colours.
 */
function IconToneFields({
  g,
  update,
  fallback = "plain",
}: {
  g: <T>(k: string) => T;
  update: (patch: Record<string, unknown>) => void;
  /** What a block with no stored treatment looked like before it was a choice. */
  fallback?: IconStyle;
}) {
  const style = iconStyle(g<string>("style"), fallback);
  return (
    <>
      <Field label="Icon background">
        <Segmented
          value={style}
          onChange={(v) => update({ style: v })}
          options={[
            { value: "plain", label: "None" },
            { value: "soft", label: "Tinted" },
            { value: "solid", label: "Filled" },
          ]}
        />
      </Field>
      {/*
        Palette swatches rather than a colour input. Each shows the tone in the
        treatment currently chosen, so the pick is made by looking at the thing
        itself — and there is no way to choose a colour that isn't 4Sale's.
      */}
      <Field label="Icon colour">
        <div className="flex flex-wrap gap-1.5">
          {ICON_TONES.map((tone) => {
            const active = iconTone(g<string>("tone")) === tone;
            return (
              <button
                key={tone}
                type="button"
                title={tone}
                onClick={() => update({ tone })}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full transition-all",
                  // A `plain` tone has no chip to show, so the swatch borrows
                  // the tinted pairing to stay visible as a swatch.
                  ICON_TONE_CLASS[tone][style === "plain" ? "soft" : style],
                  active
                    ? "ring-2 ring-brand ring-offset-2 ring-offset-background"
                    : "hover:opacity-80",
                )}
              >
                <Icon name="Check" className={cn("size-3.5", !active && "opacity-0")} />
              </button>
            );
          })}
        </div>
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
            <LInput
              value={g<LText>("text")}
              lang={lang}
              onChange={(v) => update({ text: v })}
              multiline
            />
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
            <Segmented
              value={g<Align>("align")}
              onChange={(v) => update({ align: v })}
              options={alignOptions}
            />
          </Field>
          <TextColorField tone={g<string>("tone")} update={update} />
        </>
      );
    case "text":
      return (
        <>
          <Field label="Content">
            <LInput
              value={g<LText>("text")}
              lang={lang}
              onChange={(v) => update({ text: v })}
              multiline
            />
          </Field>
          <Field label="Alignment">
            <Segmented
              value={g<Align>("align")}
              onChange={(v) => update({ align: v })}
              options={alignOptions}
            />
          </Field>
          <Field label="Style">
            <Segmented
              value={textWeight(g<string>("weight"))}
              onChange={(v) => update({ weight: v as TextWeight })}
              options={[
                { value: "regular", label: "Regular" },
                { value: "bold", label: "Bold" },
              ]}
            />
          </Field>
          <TextColorField tone={g<string>("tone")} update={update} />
        </>
      );
    case "image":
      return (
        <>
          <div className="rounded-xl border border-dashed border-border bg-neutral-surface p-4 text-center">
            <Icon name="UploadCloud" className="mx-auto size-5 text-brand" />
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
            <SliderInput
              value={g<number>("height")}
              min={120}
              max={640}
              step={20}
              onChange={(v) => update({ height: v })}
            />
          </Field>
          <Field label="Alignment">
            <Segmented
              value={g<Align>("align")}
              onChange={(v) => update({ align: v })}
              options={alignOptions}
            />
          </Field>
        </>
      );
    case "cards": {
      const items = g<{ icon: string; title: LText; body: LText }[]>("items") || [];
      const setItem = (i: number, patch: Partial<(typeof items)[number]>) =>
        update({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
      return (
        <>
          <IconToneFields g={g} update={update} fallback="soft" />
          {items.map((it, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Card {i + 1}
                </span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => update({ items: items.filter((_, idx) => idx !== i) })}
                >
                  <Icon name="Trash2" className="size-3.5" />
                </button>
              </div>
              <IconPicker value={it.icon} onChange={(v) => setItem(i, { icon: v })} />
              <LInput value={it.title} lang={lang} onChange={(v) => setItem(i, { title: v })} />
              <LInput
                value={it.body}
                lang={lang}
                onChange={(v) => setItem(i, { body: v })}
                multiline
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              update({
                items: [
                  ...items,
                  {
                    icon: "badgeCheck",
                    title: { en: "New card", ar: "بطاقة جديدة" },
                    body: { en: "", ar: "" },
                  },
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
      const setItem = (i: number, patch: Partial<(typeof items)[number]>) =>
        update({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
      return (
        <>
          {/*
            Row wraps the pairs inline; List stacks them one per line, which is
            what a page needs for a tick-list of features — the shape
            q84sale.com's own business-profile page uses.
          */}
          <Field label="Arrangement">
            <Segmented
              value={iconsLayout(g<string>("layout"))}
              onChange={(v) => update({ layout: v })}
              options={[
                { value: "row", label: "Row" },
                { value: "list", label: "List" },
              ]}
            />
          </Field>
          {/* One size for both, since the label is set at the icon's size. */}
          <Field label="Icon and text size">
            <SliderInput
              value={iconsSize(g<number>("size"))}
              min={14}
              max={40}
              step={2}
              onChange={(v) => update({ size: v })}
            />
          </Field>
          <IconToneFields g={g} update={update} />
          {items.map((it, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Item {i + 1}
                </span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => update({ items: items.filter((_, idx) => idx !== i) })}
                >
                  <Icon name="Trash2" className="size-3.5" />
                </button>
              </div>
              <IconPicker value={it.icon} onChange={(v) => setItem(i, { icon: v })} />
              <LInput value={it.label} lang={lang} onChange={(v) => setItem(i, { label: v })} />
            </div>
          ))}
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-brand hover:text-brand"
            onClick={() =>
              update({
                items: [
                  ...items,
                  { icon: "badgeCheck", label: { en: "New item", ar: "عنصر جديد" } },
                ],
              })
            }
          >
            <Icon name="Plus" className="size-3.5" />
            Add item
          </button>
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
            <Segmented
              value={g<Align>("align")}
              onChange={(v) => update({ align: v })}
              options={alignOptions}
            />
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
            <LInput
              value={g<LText>("subtitle")}
              lang={lang}
              onChange={(v) => update({ subtitle: v })}
              multiline
            />
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
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Step {i + 1}
                </span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => update({ items: items.filter((_, idx) => idx !== i) })}
                >
                  <Icon name="Trash2" className="size-3.5" />
                </button>
              </div>
              <LInput value={it.title} lang={lang} onChange={(v) => setItem(i, { title: v })} />
              <LInput
                value={it.body}
                lang={lang}
                onChange={(v) => setItem(i, { body: v })}
                multiline
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              update({
                items: [
                  ...items,
                  { title: { en: "New step", ar: "خطوة" }, body: { en: "", ar: "" } },
                ],
              })
            }
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
            onClick={() =>
              update({
                items: [...items, { q: { en: "Question", ar: "سؤال" }, a: { en: "", ar: "" } }],
              })
            }
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
            <TextInput
              value={g<string>("anchor")}
              onChange={(e) => update({ anchor: e.target.value })}
            />
          </Field>
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Fields
            </p>
            {fields.map((f, i) => (
              <div key={f.id} className="space-y-2 rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Field {i + 1}
                  </span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => update({ fields: fields.filter((_, idx) => idx !== i) })}
                  >
                    <Icon name="Trash2" className="size-3.5" />
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
                <Toggle
                  label="Required"
                  checked={f.required}
                  onChange={(v) => setField(i, { required: v })}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                update({
                  fields: [
                    ...fields,
                    {
                      id: uid(),
                      label: { en: "New field", ar: "حقل جديد" },
                      type: "text",
                      required: false,
                    },
                  ],
                })
              }
              className="w-full rounded-lg border border-dashed border-border py-2 text-xs font-medium hover:border-brand hover:text-brand"
            >
              + Add field
            </button>
          </div>
          <Field label="Submit button label">
            <LInput
              value={g<LText>("submitLabel")}
              lang={lang}
              onChange={(v) => update({ submitLabel: v })}
            />
          </Field>
          <Field label="Success message">
            <LInput
              value={g<LText>("success")}
              lang={lang}
              onChange={(v) => update({ success: v })}
              multiline
            />
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
          <Field label="Block title">
            <LInput value={g<LText>("title")} lang={lang} onChange={(v) => update({ title: v })} />
          </Field>
          <ListingsEditor props={p} lang={lang} update={update} />
          <Toggle
            label="Enable CTA"
            checked={readCardCtas(g("cardCtas"))}
            onChange={(on) => update({ cardCtas: on })}
          />
          {readCardCtas(g("cardCtas")) ? (
            <p className="text-[11px] text-muted-foreground">
              Call, WhatsApp and Chat are showing on each card.
            </p>
          ) : null}
        </>
      );
    case "spacer":
      return (
        <Field label="Height">
          <SliderInput
            value={g<number>("height")}
            min={8}
            max={160}
            step={8}
            onChange={(v) => update({ height: v })}
          />
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
        <Icon name="MousePointerSquareDashed" className="size-6 text-muted-foreground" />
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
                <IconBtn
                  icon="Trash2"
                  danger
                  title="Delete (Delete or Backspace)"
                  onClick={onDeleteElement}
                />
              </>
            ) : (
              <>
                <IconBtn icon="ArrowUp" onClick={() => onMoveContainer(-1)} />
                <IconBtn icon="ArrowDown" onClick={() => onMoveContainer(1)} />
                <IconBtn icon="Copy" onClick={onDuplicateContainer} />
                <IconBtn
                  icon="Trash2"
                  danger
                  title="Delete (Delete or Backspace)"
                  onClick={onDeleteContainer}
                />
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
              <TextInput
                value={container.name}
                onChange={(e) => updateContainer({ name: e.target.value })}
              />
            </Field>
            <Field label="Direction">
              <Segmented
                value={containerDirection(container.direction)}
                onChange={(v) => updateContainer({ direction: v })}
                options={[
                  { value: "horizontal", label: "Horizontal" },
                  { value: "vertical", label: "Vertical" },
                ]}
              />
            </Field>
            <Field
              label={
                containerDirection(container.direction) === "vertical"
                  ? "Row layout"
                  : "Column layout"
              }
            >
              <SelectInput
                value={container.layout}
                onChange={(v) => updateContainer({ layout: v as ContainerLayout })}
                options={(Object.keys(LAYOUT_LABEL) as ContainerLayout[]).map((k) => ({
                  value: k,
                  label: layoutLabel(k, container.direction),
                }))}
              />
            </Field>
            {containerTracks(container).length > 1 ? (
              <p className="text-[11px] text-muted-foreground">
                Split{" "}
                {containerTracks(container)
                  .map((n) => `${Math.round(n)}%`)
                  .join(" / ")}{" "}
                — drag the divider on the canvas to change it.
              </p>
            ) : null}
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
            <BackgroundEditor container={container} updateContainer={updateContainer} />
            <Field label="Vertical padding">
              <SliderInput
                value={container.paddingY}
                onChange={(v) => updateContainer({ paddingY: v })}
              />
            </Field>
            <Field label="Min height">
              <SliderInput
                value={container.minHeight ?? 0}
                min={0}
                max={800}
                step={8}
                onChange={(v) => updateContainer({ minHeight: v || undefined })}
              />
            </Field>
            <Field label="Column spacing">
              <SliderInput
                value={container.gap}
                max={80}
                onChange={(v) => updateContainer({ gap: v })}
              />
            </Field>
            <Field label="Border radius">
              <SliderInput
                value={container.radius}
                max={48}
                onChange={(v) => updateContainer({ radius: v })}
              />
            </Field>
            <div className="flex items-start gap-2 rounded-lg bg-brand-soft p-2.5 text-[11px] text-brand">
              <Icon name="Smartphone" className="mt-0.5 size-3.5 shrink-0" />
              Columns stack automatically on mobile — responsive behaviour is enforced by the
              system.
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

/**
 * Background picker: the four 4Sale presets, or an image with a readability
 * scrim. There is no free colour — a page built here is embedded in
 * q84sale.com, so a section that can be any hex is a section that can stop
 * looking like 4Sale.
 */
function BackgroundEditor({
  container,
  updateContainer,
}: {
  container: Container;
  updateContainer: (patch: Partial<Container>) => void;
}) {
  const bg = container.bg;
  const mode: "preset" | "image" = bg?.type === "image" ? "image" : "preset";

  const setMode = (m: "preset" | "image") => {
    if (m === "preset") return updateContainer({ bg: undefined, textTone: "auto" });
    updateContainer({
      bg: { type: "image", src: "", size: "cover", position: "center", overlay: 35 },
      textTone: "auto",
    });
  };

  const patchImage = (patch: Partial<Extract<ContainerBg, { type: "image" }>>) => {
    if (bg?.type !== "image") return;
    updateContainer({ bg: { ...bg, ...patch } });
  };

  // Held as a data URL so it survives re-renders. Object URLs would die on
  // reload, and there is no asset host yet — see the warning below.
  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => patchImage({ src: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <>
      <Field label="Background">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "preset", label: "Color" },
            { value: "image", label: "image" },
          ]}
        />
      </Field>

      {mode === "preset" && (
        <Field label="Color">
          <Segmented
            value={container.background}
            onChange={(v) =>
              updateContainer({ background: v as Container["background"], bg: undefined })
            }
            options={[
              { value: "white", label: "White" },
              { value: "soft", label: "Light blue" },
              { value: "gray", label: "Gray" },
              { value: "brand", label: "Blue" },
            ]}
          />
        </Field>
      )}

      {bg?.type === "image" && (
        <>
          <Field label="Image URL">
            <TextInput
              value={bg.src.startsWith("data:") ? "" : bg.src}
              placeholder="https://…"
              onChange={(e) => patchImage({ src: e.target.value })}
            />
          </Field>
          <label className="block cursor-pointer rounded-xl border border-dashed border-border bg-neutral-surface p-3 text-center hover:border-brand">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) readFile(f);
              }}
            />
            <Icon name="UploadCloud" className="mx-auto size-4 text-brand" />
            <span className="mt-1 block text-[11px] font-medium">
              {bg.src.startsWith("data:") ? "Replace uploaded image" : "Upload from computer"}
            </span>
          </label>
          {bg.src.startsWith("data:") && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-100 p-2.5 text-[11px] text-amber-800">
              <Icon name="AlertTriangle" className="mt-0.5 size-3.5 shrink-0" />
              Preview only — uploaded files aren’t hosted yet, so this image won’t appear on the
              published page. Use a URL for anything you intend to publish.
            </div>
          )}
          <Field label="Fit">
            <Segmented
              value={bg.size}
              onChange={(v) => patchImage({ size: v })}
              options={[
                { value: "cover", label: "Cover" },
                { value: "contain", label: "Contain" },
              ]}
            />
          </Field>
          <Field label="Position">
            <Segmented
              value={bg.position}
              onChange={(v) => patchImage({ position: v })}
              options={[
                { value: "top", label: "Top" },
                { value: "center", label: "Center" },
                { value: "bottom", label: "Bottom" },
              ]}
            />
          </Field>
          <Field label="Darken for readability">
            <SliderInput
              value={bg.overlay}
              min={0}
              max={80}
              step={5}
              suffix="%"
              onChange={(v) => patchImage({ overlay: v })}
            />
          </Field>
        </>
      )}

      {mode !== "preset" && (
        <Field label="Text color">
          <Segmented
            value={container.textTone ?? "auto"}
            onChange={(v) => updateContainer({ textTone: v })}
            options={[
              { value: "auto", label: "Auto" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </Field>
      )}
    </>
  );
}

function IconBtn({
  icon,
  onClick,
  danger,
  title,
}: {
  icon: string;
  onClick: () => void;
  danger?: boolean | undefined;
  title?: string | undefined;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={
        "rounded-md border border-border p-1.5 text-muted-foreground transition hover:bg-neutral-surface " +
        (danger ? "hover:border-destructive hover:text-destructive" : "hover:text-brand")
      }
    >
      <Icon name={icon} className="size-3.5" />
    </button>
  );
}
