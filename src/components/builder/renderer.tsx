import { useRef, useState } from "react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type Container,
  type Cta,
  type FormField,
  type Lang,
  type LText,
  type PageElement,
  t,
} from "@/lib/builder-types";
import { IMAGE_MAP, MOCK_LISTINGS } from "@/lib/builder-content";

export function LucideIcon({ name, className }: { name: string; className?: string | undefined }) {
  const Cmp = (
    Icons as unknown as Record<string, React.ComponentType<{ className?: string | undefined }>>
  )[name];
  const Fallback = Icons.Circle;
  const C = Cmp ?? Fallback;
  return <C className={className} />;
}

/**
 * Props spread onto a text node to make it editable in place.
 *
 * `path` is a dotted path into the element's props (`"text"`, `"cta.label"`,
 * `"items.1.title"`), resolved by `setLocalizedText`.
 */
export type EditBind = (
  path: string,
  opts?: { multiline?: boolean },
) => Record<string, unknown>;

const EDIT_STYLE: React.CSSProperties = {
  outline: "2px solid var(--brand)",
  outlineOffset: 3,
  borderRadius: 4,
  minWidth: "2ch",
  whiteSpace: "pre-wrap",
  cursor: "text",
};

/**
 * Double-click to edit text directly on the canvas.
 *
 * Uses `contentEditable` rather than swapping in an <input>, so the text keeps
 * its real typography while being edited — what you type is what publishes.
 * Enter commits, Escape reverts, blur commits. Reads `innerText` (not
 * `textContent`) so line breaks in a paragraph survive.
 *
 * Which node is being edited is owned by the canvas, not by this hook. Held
 * locally, an element whose blur never fired (a re-render that replaces the
 * node) stayed editable, and several nodes could be editable at once. A single
 * lifted value makes that state impossible to reach.
 */
function useInlineEdit(
  editingPath: string | null,
  onEditText?: ((path: string, value: string) => void) | undefined,
  onStartEdit?: ((path: string) => void) | undefined,
  onStopEdit?: (() => void) | undefined,
): EditBind {
  const original = useRef("");
  const cancelled = useRef(false);

  return (path, opts) => {
    if (!onEditText || !onStartEdit || !onStopEdit) return {};

    if (editingPath !== path) {
      return {
        onDoubleClick: (e: React.MouseEvent<HTMLElement>) => {
          e.stopPropagation();
          original.current = e.currentTarget.innerText;
          onStartEdit(path);
        },
        title: "Double-click to edit",
      };
    }

    const finish = (node: HTMLElement, commit: boolean) => {
      delete node.dataset["inlineFocus"];
      onStopEdit();
      if (!commit) return;
      // contentEditable substitutes non-breaking spaces; normalise them back.
      const value = node.innerText.replace(/\u00a0/g, " ").replace(/\n+$/, "");
      if (value !== original.current) onEditText(path, value);
    };

    return {
      contentEditable: true,
      suppressContentEditableWarning: true,
      spellCheck: false,
      draggable: false,
      style: EDIT_STYLE,
      // Focus and select once, not on every keystroke — re-focusing would
      // reset the caret to the start while typing.
      ref: (node: HTMLElement | null) => {
        if (!node || node.dataset["inlineFocus"] === "1") return;
        node.dataset["inlineFocus"] = "1";
        node.focus();
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      },
      onClick: (e: React.MouseEvent) => e.stopPropagation(),
      onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === "Escape") {
          e.preventDefault();
          cancelled.current = true;
          e.currentTarget.innerText = original.current;
          e.currentTarget.blur();
        } else if (e.key === "Enter" && !e.shiftKey && !opts?.multiline) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      },
      onBlur: (e: React.FocusEvent<HTMLElement>) => {
        const commit = !cancelled.current;
        cancelled.current = false;
        finish(e.currentTarget, commit);
      },
    };
  };
}

const alignClass = (a?: string) =>
  a === "center" ? "text-center" : a === "end" ? "text-end" : "text-start";
const flexAlign = (a?: string) =>
  a === "center" ? "justify-center" : a === "end" ? "justify-end" : "justify-start";

const BG: Record<Container["background"], string> = {
  white: "bg-background",
  soft: "bg-brand-soft",
  brand: "bg-brand text-brand-foreground",
  gray: "bg-neutral-surface",
};

const WIDTH: Record<Container["contentWidth"], string> = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
  full: "max-w-none",
};

/**
 * Breakpoints here are CONTAINER queries (`@min-[768px]:`), not viewport ones
 * (`md:`).
 *
 * The canvas simulates a phone by narrowing its wrapper to ~384px, but a `md:`
 * utility keys off the browser window, which is still desktop-width — so the
 * layout stayed two-column inside the phone frame. Container queries measure the
 * wrapper instead, which is what the device toggle actually changes.
 *
 * The pixel values match the published stylesheet's media queries in
 * `src/lib/publish/styles.ts`, so the canvas and the real page break at the same
 * widths. Any `@min-[...]` utility added here needs `@container` on an ancestor
 * (the canvas and preview wrappers in `index.tsx` both set it).
 */
const COLS: Record<Container["layout"], string> = {
  "1": "grid-cols-1",
  "50-50": "grid-cols-1 @min-[768px]:grid-cols-2",
  "35-65": "grid-cols-1 @min-[768px]:grid-cols-[35fr_65fr]",
  "65-35": "grid-cols-1 @min-[768px]:grid-cols-[65fr_35fr]",
  "3": "grid-cols-1 @min-[768px]:grid-cols-3",
};

function CtaButton({
  cta,
  lang,
  onFire,
  bind,
  labelPath,
}: {
  cta: Cta;
  lang: Lang;
  onFire?: ((c: Cta) => void) | undefined;
  bind?: EditBind | undefined;
  labelPath?: string | undefined;
}) {
  const base =
    "inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all active:scale-[0.98]";
  const variants: Record<string, string> = {
    primary: "bg-brand text-brand-foreground shadow-brand hover:bg-brand-strong",
    secondary: "bg-brand-soft text-brand border border-brand/20 hover:bg-brand-soft/70",
    inverse: "bg-background text-brand hover:bg-background/90",
  };
  const icon: Record<string, string> = {
    internal: "ArrowRight",
    external: "ExternalLink",
    scroll: "ArrowDown",
    app: "Smartphone",
    search: "Search",
  };
  return (
    <button
      type="button"
      onClick={() => onFire?.(cta)}
      className={cn(base, variants[cta.variant] ?? variants["primary"])}
    >
      <span {...(bind && labelPath ? bind(labelPath) : {})}>{t(cta.label, lang)}</span>
      <LucideIcon name={icon[cta.action] ?? "ArrowRight"} className={cn("size-4", cta.action === "internal" && "rtl:rotate-180")} />
    </button>
  );
}

function LeadForm({
  el,
  lang,
  onFire,
  bind,
}: {
  el: PageElement;
  lang: Lang;
  onFire?: ((c: Cta) => void) | undefined;
  bind?: EditBind | undefined;
}) {
  const edit: EditBind = bind ?? (() => ({}));
  const p = el.props as {
    title: LText;
    anchor: string;
    fields: FormField[];
    submitLabel: LText;
    success: LText;
    redirect?: string;
  };
  const [sent, setSent] = useState(false);
  const input =
    "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

  return (
    <div
      id={p.anchor || "lead-form"}
      className="rounded-2xl border border-border bg-background p-6 shadow-card"
    >
      <h3 className="text-lg font-semibold" {...edit("title")}>
        {t(p.title, lang)}
      </h3>
      {sent ? (
        <div className="mt-4 rounded-xl bg-brand-soft p-4 text-sm text-brand">
          {t(p.success, lang)}
          {p.redirect ? (
            <div className="mt-1 text-xs opacity-70">Redirecting to {p.redirect}</div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {(p.fields || []).map((f, fi) => (
            <div key={f.id}>
              {f.type !== "checkbox" && (
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  <span {...edit(`fields.${fi}.label`)}>{t(f.label, lang)}</span>
                  {f.required ? <span className="text-destructive"> *</span> : null}
                </label>
              )}
              {f.type === "dropdown" ? (
                <select className={input}>
                  {(f.options || "Option").split(",").map((o) => (
                    <option key={o}>{o.trim()}</option>
                  ))}
                </select>
              ) : f.type === "checkbox" ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 accent-[var(--brand)]" />
                  {t(f.label, lang)}
                  {f.required ? <span className="text-destructive">*</span> : null}
                </label>
              ) : (
                <input
                  className={input}
                  type={f.type === "phone" ? "tel" : f.type}
                  placeholder={t(f.label, lang)}
                />
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setSent(true);
              onFire?.({
                label: p.submitLabel,
                action: "internal",
                destination: p.redirect || "(no redirect)",
                event: "form_submit",
                variant: "primary",
              });
            }}
            className="w-full rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-brand hover:bg-brand-strong"
          >
            <span {...edit("submitLabel")}>{t(p.submitLabel, lang)}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function ElementView({
  el,
  lang,
  editing,
  onFire,
  onEditText,
  editingPath = null,
  onStartEdit,
  onStopEdit,
}: {
  el: PageElement;
  lang: Lang;
  editing?: boolean | undefined;
  onFire?: ((c: Cta) => void) | undefined;
  /** Enables double-click-to-edit on the canvas. Omitted in preview/publish. */
  onEditText?: ((path: string, value: string) => void) | undefined;
  /** The prop path being edited on THIS element, owned by the canvas. */
  editingPath?: string | null | undefined;
  onStartEdit?: ((path: string) => void) | undefined;
  onStopEdit?: (() => void) | undefined;
}) {
  const p = el.props as Record<string, never> as Record<string, unknown>;
  const g = <T,>(k: string) => p[k] as T;
  const bind = useInlineEdit(editingPath, onEditText, onStartEdit, onStopEdit);

  switch (el.type) {
    case "heading": {
      const level = g<string>("level");
      const cls = cn(
        "font-semibold tracking-tight",
        level === "h1" ? "text-4xl @min-[768px]:text-5xl leading-[1.1]" : level === "h2" ? "text-3xl" : "text-xl",
        alignClass(g<string>("align")),
      );
      // Single-line: Enter commits. Paragraphs pass multiline so Enter breaks.
      const editable = bind("text");
      return level === "h1" ? (
        <h1 className={cls} {...editable}>
          {t(g<LText>("text"), lang)}
        </h1>
      ) : level === "h3" ? (
        <h3 className={cls} {...editable}>
          {t(g<LText>("text"), lang)}
        </h3>
      ) : (
        <h2 className={cls} {...editable}>
          {t(g<LText>("text"), lang)}
        </h2>
      );
    }
    case "text":
      return (
        <p
          className={cn("text-base leading-relaxed opacity-80", alignClass(g<string>("align")))}
          {...bind("text", { multiline: true })}
        >
          {t(g<LText>("text"), lang)}
        </p>
      );
    case "image": {
      const src = g<string>("src");
      const resolved = IMAGE_MAP[src] || src;
      const h = g<number>("height") || 300;
      return (
        <div className={cn("flex", flexAlign(g<string>("align")))}>
          {resolved ? (
            <img
              src={resolved}
              alt={t(g<LText>("alt"), lang)}
              loading="lazy"
              style={{ height: h }}
              className="w-full rounded-2xl object-cover shadow-card"
            />
          ) : (
            <div
              style={{ height: h }}
              className="flex w-full items-center justify-center rounded-2xl border border-dashed border-border bg-neutral-surface text-sm text-muted-foreground"
            >
              <LucideIcon name="ImagePlus" className="me-2 size-5" /> Image placeholder
            </div>
          )}
        </div>
      );
    }
    case "video":
      return (
        <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-neutral-900/90 text-white/80">
          <LucideIcon name="PlayCircle" className="size-12" />
        </div>
      );
    case "cards": {
      const items = g<{ icon: string; title: LText; body: LText }[]>("items") || [];
      return (
        <div className={cn("grid gap-4", items.length >= 3 ? "@min-[768px]:grid-cols-3" : "@min-[768px]:grid-cols-2")}>
          {items.map((c, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-background p-6 text-start shadow-card transition-shadow hover:shadow-lift"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <LucideIcon name={c.icon} className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold" {...bind(`items.${i}.title`)}>
                {t(c.title, lang)}
              </h3>
              <p className="mt-1.5 text-sm opacity-70" {...bind(`items.${i}.body`, { multiline: true })}>
                {t(c.body, lang)}
              </p>
            </div>
          ))}
        </div>
      );
    }
    case "icons": {
      const items = g<{ icon: string; label: LText }[]>("items") || [];
      return (
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 text-sm font-medium">
              <LucideIcon name={it.icon} className="size-4 text-brand" />
              <span {...bind(`items.${i}.label`)}>{t(it.label, lang)}</span>
            </div>
          ))}
        </div>
      );
    }
    case "cta":
      return (
        <div className={cn("flex", flexAlign(g<string>("align")))}>
          <CtaButton
            cta={el.props as unknown as Cta}
            lang={lang}
            onFire={onFire}
            bind={bind}
            labelPath="label"
          />
        </div>
      );
    case "ctaSection": {
      const cta = g<Cta>("cta");
      return (
        <div className="rounded-3xl bg-brand px-8 py-12 text-center text-brand-foreground shadow-brand">
          <h2 className="text-3xl font-semibold tracking-tight" {...bind("title")}>
            {t(g<LText>("title"), lang)}
          </h2>
          <p
            className="mx-auto mt-2 max-w-xl text-sm opacity-85"
            {...bind("subtitle", { multiline: true })}
          >
            {t(g<LText>("subtitle"), lang)}
          </p>
          <div className="mt-6 flex justify-center">
            <CtaButton cta={cta} lang={lang} onFire={onFire} bind={bind} labelPath="cta.label" />
          </div>
        </div>
      );
    }
    case "form":
      return <LeadForm el={el} lang={lang} onFire={onFire} bind={bind} />;
    case "listings": {
      const count = Number(g<number>("count") || 4);
      return (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold" {...bind("title")}>
              {t(g<LText>("title"), lang)}
            </h3>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {[g<string>("category"), g<string>("make"), g<string>("model"), g<string>("area")]
                .filter(Boolean)
                .map((f) => (
                  <span key={f} className="rounded-full bg-brand-soft px-2.5 py-1 font-medium text-brand">
                    {f}
                  </span>
                ))}
            </div>
          </div>
          {editing && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">
              <LucideIcon name="Plug" className="size-3.5" />
              API-dependent integration — mocked data in prototype
            </div>
          )}
          <div className="grid gap-4 @min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-4">
            {MOCK_LISTINGS.slice(0, count).map((l) => (
              <div key={l.title} className="overflow-hidden rounded-2xl border border-border bg-background shadow-card">
                <div className="flex h-28 items-center justify-center bg-neutral-surface text-muted-foreground">
                  <LucideIcon name="Car" className="size-8" />
                </div>
                <div className="p-3">
                  <div className="text-xs font-medium text-brand">{l.tag}</div>
                  <div className="mt-1 line-clamp-1 text-sm font-semibold">{l.title}</div>
                  <div className="mt-1 text-sm font-bold">{l.price}</div>
                  <div className="text-xs opacity-60">{l.area}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "faq": {
      const items = g<{ q: LText; a: LText }[]>("items") || [];
      return (
        <div className="divide-y divide-border rounded-2xl border border-border bg-background">
          {items.map((it, i) => (
            <details key={i} className="group p-4" open={i === 0}>
              <summary className="cursor-pointer list-none text-sm font-semibold">
                <span {...bind(`items.${i}.q`)}>{t(it.q, lang)}</span>
              </summary>
              <p className="mt-2 text-sm opacity-70" {...bind(`items.${i}.a`, { multiline: true })}>
                {t(it.a, lang)}
              </p>
            </details>
          ))}
        </div>
      );
    }
    case "steps": {
      const items = g<{ title: LText; body: LText }[]>("items") || [];
      return (
        <div className="grid gap-4 @min-[768px]:grid-cols-3">
          {items.map((s, i) => (
            <div key={i} className="rounded-2xl bg-neutral-surface p-6">
              <div className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground">
                {i + 1}
              </div>
              <h3 className="mt-4 text-base font-semibold" {...bind(`items.${i}.title`)}>
                {t(s.title, lang)}
              </h3>
              <p className="mt-1 text-sm opacity-70" {...bind(`items.${i}.body`, { multiline: true })}>
                {t(s.body, lang)}
              </p>
            </div>
          ))}
        </div>
      );
    }
    case "divider":
      return <hr className="border-border" />;
    case "spacer":
      return <div style={{ height: Number(g<number>("height") || 40) }} />;
    default:
      return null;
  }
}

export function ContainerView({
  container,
  lang,
  children,
  className,
}: {
  container: Container;
  lang: Lang;
  children: (colIndex: number) => React.ReactNode;
  className?: string | undefined;
}) {
  void lang;
  return (
    <section
      className={cn(BG[container.background], className)}
      style={{
        paddingTop: container.paddingY,
        paddingBottom: container.paddingY,
        borderRadius: container.radius,
      }}
    >
      <div className={cn("mx-auto px-6", WIDTH[container.contentWidth])}>
        <div
          className={cn(
            "grid items-start",
            COLS[container.layout],
            container.align === "center" && "items-center",
            container.align === "end" && "items-end",
          )}
          style={{ gap: container.gap }}
        >
          {container.columns.map((_, i) => (
            <div key={i}>{children(i)}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PageRenderer({
  containers,
  lang,
  onFire,
}: {
  containers: Container[];
  lang: Lang;
  onFire?: ((c: Cta) => void) | undefined;
}) {
  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="bg-background">
      {containers.map((c) => (
        <ContainerView key={c.id} container={c} lang={lang}>
          {(i) => (
            <div className="space-y-5">
              {(c.columns[i] ?? []).map((el) => (
                <ElementView key={el.id} el={el} lang={lang} onFire={onFire} />
              ))}
            </div>
          )}
        </ContainerView>
      ))}
    </div>
  );
}
