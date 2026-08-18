import {
  COLUMN_COUNT,
  type Container,
  type Cta,
  type FormField,
  type Lang,
  type LText,
  type PageElement,
  t,
} from "@/lib/builder-types";
import { IMAGE_MAP } from "@/lib/builder-content";
import {
  DEFAULT_CTA_COLOR,
  TONE_COLOR,
  backgroundStyle,
  ctaLabelColor,
  hasCustomBg,
  overlayStyle,
  resolveTone,
  toCssText,
} from "@/lib/container-bg";
import { FORM_ACTION, resolveAssetUrl } from "./config";
import { attrs, cls, esc, escLines, fieldName } from "./html";
import { iconSvg } from "./icon";

/**
 * Turns the builder's page tree into an HTML string.
 *
 * This is the second reader of the same data `renderer.tsx` reads: the renderer
 * tells React what to draw on the canvas, this writes HTML text for publishing.
 * Keep the two in step — the `switch` below is typed against `ElementType`, so
 * adding an element without handling it here is a compile error, not a silently
 * blank section in a published page.
 *
 * Two hard rules for anything emitted here:
 *
 * - **No `<script>`.** The host site injects this HTML with
 *   `dangerouslySetInnerHTML`, and scripts inserted that way never execute.
 *   Interactivity is therefore CSS-only (`<details>`, `:focus`, native form
 *   validation) or delegated to the host through `data-fs-*` attributes.
 * - **Everything author-supplied goes through `esc`.** Marketing copy contains
 *   `&`, quotes and angle brackets.
 */

export type SerializeOptions = {
  lang: Lang;
  /** Absolute origin used to rewrite bundled asset paths. */
  assetOrigin: string;
  /** POST target for exported lead forms. */
  formAction?: string;
};

/* ------------------------------------------------------------------ helpers */

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : v == null ? fallback : String(v);

const num = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const ltext = (v: unknown, lang: Lang): string =>
  v && typeof v === "object" ? t(v as LText, lang) : str(v);

const list = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const alignCls = (v: unknown): string =>
  v === "center" ? "fs-lp-ta-center" : v === "end" ? "fs-lp-ta-end" : "fs-lp-ta-start";

const justifyCls = (v: unknown): string =>
  v === "center" ? "fs-lp-ja-center" : v === "end" ? "fs-lp-ja-end" : "fs-lp-ja-start";

/** Fills in defaults so a partially-configured CTA still exports cleanly. */
function readCta(v: unknown): Cta {
  const c = (v ?? {}) as Partial<Cta>;
  return {
    label: c.label ?? { en: "", ar: "" },
    action: c.action ?? "internal",
    destination: str(c.destination),
    event: str(c.event),
    variant: c.variant ?? "primary",
  };
}

const CTA_ICON: Record<Cta["action"], string> = {
  internal: "ArrowRight",
  external: "ExternalLink",
  scroll: "ArrowDown",
  app: "Smartphone",
  search: "Search",
};

/** `scroll` CTAs target an anchor on the same page; everything else is a URL. */
function ctaHref(cta: Cta): string {
  const dest = cta.destination.trim();
  if (cta.action === "scroll") return dest.startsWith("#") ? dest : `#${dest || "lead-form"}`;
  return dest || "#";
}

function ctaHtml(cta: Cta, lang: Lang): string {
  const external = cta.action === "external";
  const icon = iconSvg(
    CTA_ICON[cta.action],
    cls("fs-lp-ic", cta.action === "internal" && "fs-lp-cta-arrow"),
  );
  // A custom colour is per-CTA data, so it is inlined rather than living in the
  // shared stylesheet the way the three fixed variants do.
  const customStyle =
    cta.variant === "custom"
      ? toCssText({
          backgroundColor: cta.color || DEFAULT_CTA_COLOR,
          color: ctaLabelColor(cta),
        })
      : "";

  return `<a class="${cls("fs-lp-cta", `fs-lp-cta-${cta.variant}`)}"${attrs({
    ...(customStyle ? { style: customStyle } : {}),
    href: ctaHref(cta),
    target: external ? "_blank" : undefined,
    rel: external ? "noopener noreferrer" : undefined,
    // The host site's analytics (Amplitude) reads these; we cannot ship a
    // click handler because injected scripts don't run.
    "data-fs-event": cta.event,
    "data-fs-action": cta.action,
  })}>${esc(ltext(cta.label, lang))}${icon}</a>`;
}

/* ----------------------------------------------------------------- elements */

function serializeElement(el: PageElement, o: SerializeOptions): string {
  const p = el.props;
  const lang = o.lang;

  switch (el.type) {
    case "heading": {
      const level = str(p["level"], "h2");
      const tag = level === "h1" ? "h1" : level === "h3" ? "h3" : "h2";
      return `<${tag} class="${cls(`fs-lp-${tag}`, alignCls(p["align"]))}">${escLines(
        ltext(p["text"], lang),
      )}</${tag}>`;
    }

    case "text":
      return `<p class="${cls("fs-lp-p", alignCls(p["align"]))}">${escLines(
        ltext(p["text"], lang),
      )}</p>`;

    case "image": {
      // Seeded content stores sentinels ("__hero__") that map to bundled
      // assets; the canvas resolves them the same way via IMAGE_MAP.
      const raw = str(p["src"]);
      const src = resolveAssetUrl(IMAGE_MAP[raw] ?? raw, o.assetOrigin);
      const height = num(p["height"], 300);
      const alt = esc(ltext(p["alt"], lang));
      const inner = src
        ? `<img class="fs-lp-img" src="${esc(src)}" alt="${alt}" style="height:${height}px" loading="lazy" decoding="async">`
        : `<div class="fs-lp-imgph" style="height:${height}px">${iconSvg("ImagePlus")}<span>Image placeholder</span></div>`;
      return `<div class="${cls("fs-lp-row", justifyCls(p["align"]))}">${inner}</div>`;
    }

    case "video": {
      const caption = esc(ltext(p["label"], lang));
      return `<div class="fs-lp-video">${iconSvg("PlayCircle")}${
        caption ? `<span class="fs-lp-video-c">${caption}</span>` : ""
      }</div>`;
    }

    case "cards": {
      const items = list<{ icon?: string; title?: LText; body?: LText }>(p["items"]);
      if (!items.length) return "";
      const cards = items
        .map(
          (c) =>
            `<article class="fs-lp-card">` +
            `<div class="fs-lp-card-ic">${iconSvg(str(c.icon, "BadgeCheck"))}</div>` +
            `<h3 class="fs-lp-card-t">${esc(ltext(c.title, lang))}</h3>` +
            `<p class="fs-lp-card-b">${escLines(ltext(c.body, lang))}</p>` +
            `</article>`,
        )
        .join("");
      // Matches the canvas: 3-up once there are three or more cards, else 2-up.
      return `<div class="${cls("fs-lp-cards", items.length >= 3 ? "fs-lp-cards-3" : "fs-lp-cards-2")}">${cards}</div>`;
    }

    case "icons": {
      const items = list<{ icon?: string; label?: LText }>(p["items"]);
      if (!items.length) return "";
      return `<div class="fs-lp-icons">${items
        .map(
          (i) =>
            `<span class="fs-lp-icons-i">${iconSvg(str(i.icon, "Check"))}${esc(
              ltext(i.label, lang),
            )}</span>`,
        )
        .join("")}</div>`;
    }

    case "cta":
      return `<div class="${cls("fs-lp-row", justifyCls(p["align"]))}">${ctaHtml(
        readCta(p),
        lang,
      )}</div>`;

    case "ctaSection": {
      const subtitle = escLines(ltext(p["subtitle"], lang));
      return (
        `<div class="fs-lp-ctasec">` +
        `<h2 class="fs-lp-ctasec-t">${escLines(ltext(p["title"], lang))}</h2>` +
        (subtitle ? `<p class="fs-lp-ctasec-s">${subtitle}</p>` : "") +
        `<div class="fs-lp-row fs-lp-ja-center">${ctaHtml(readCta(p["cta"]), lang)}</div>` +
        `</div>`
      );
    }

    case "form":
      return serializeForm(el, o);

    case "listings":
      return serializeListings(el, o);

    case "faq": {
      const items = list<{ q?: LText; a?: LText }>(p["items"]);
      if (!items.length) return "";
      // <details> gives us an accordion with zero JavaScript.
      return `<div class="fs-lp-faq">${items
        .map(
          (it, i) =>
            `<details class="fs-lp-faq-i"${i === 0 ? " open" : ""}>` +
            `<summary class="fs-lp-faq-q">${esc(ltext(it.q, lang))}</summary>` +
            `<p class="fs-lp-faq-a">${escLines(ltext(it.a, lang))}</p>` +
            `</details>`,
        )
        .join("")}</div>`;
    }

    case "steps": {
      const items = list<{ title?: LText; body?: LText }>(p["items"]);
      if (!items.length) return "";
      return `<ol class="fs-lp-steps">${items
        .map(
          (s, i) =>
            `<li class="fs-lp-step">` +
            `<span class="fs-lp-step-n">${i + 1}</span>` +
            `<h3 class="fs-lp-step-t">${esc(ltext(s.title, lang))}</h3>` +
            `<p class="fs-lp-step-b">${escLines(ltext(s.body, lang))}</p>` +
            `</li>`,
        )
        .join("")}</ol>`;
    }

    case "divider":
      return `<hr class="fs-lp-hr">`;

    case "spacer":
      return `<div style="height:${num(p["height"], 40)}px" aria-hidden="true"></div>`;

    default: {
      // Exhaustiveness guard: if this errors, a new ElementType was added
      // without a case above, and publishing it would emit nothing.
      const unhandled: never = el.type;
      void unhandled;
      return "";
    }
  }
}

/* --------------------------------------------------------------------- form */

/**
 * A published lead form is a plain HTML POST.
 *
 * No script means no fetch-and-show-success, so the success message and any
 * redirect travel as `data-fs-*` attributes plus a pre-rendered hidden node.
 * The host can reveal it after its own submit handling; without a host handler
 * the form still works as a normal browser POST.
 */
function serializeForm(el: PageElement, o: SerializeOptions): string {
  const p = el.props;
  const lang = o.lang;
  const anchor = str(p["anchor"], "lead-form") || "lead-form";
  const fields = list<FormField>(p["fields"]);

  const body = fields
    .map((f) => {
      const label = ltext(f.label, lang);
      const name = fieldName(ltext(f.label, "en"), f.id);
      const req = f.required === true;

      if (f.type === "checkbox") {
        return (
          `<div class="fs-lp-f"><label class="fs-lp-ck">` +
          `<input type="checkbox"${attrs({ name, required: req })}>` +
          `<span>${esc(label)}${req ? `<span class="fs-lp-req"> *</span>` : ""}</span>` +
          `</label></div>`
        );
      }

      const labelHtml =
        `<label class="fs-lp-lb" for="${esc(`${anchor}-${name}`)}">${esc(label)}` +
        (req ? `<span class="fs-lp-req"> *</span>` : "") +
        `</label>`;

      if (f.type === "dropdown") {
        const options = str(f.options)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        return (
          `<div class="fs-lp-f">${labelHtml}` +
          `<select class="fs-lp-in"${attrs({ id: `${anchor}-${name}`, name, required: req })}>` +
          options.map((opt) => `<option value="${esc(opt)}">${esc(opt)}</option>`).join("") +
          `</select></div>`
        );
      }

      const inputType = f.type === "phone" ? "tel" : f.type === "email" ? "email" : "text";
      return (
        `<div class="fs-lp-f">${labelHtml}` +
        `<input class="fs-lp-in"${attrs({
          type: inputType,
          id: `${anchor}-${name}`,
          name,
          placeholder: label,
          required: req,
          // Lets the host phone-format Kuwaiti numbers without re-parsing labels.
          "data-fs-field": f.type,
        })}></div>`
      );
    })
    .join("");

  const success = ltext(p["success"], lang);
  const redirect = str(p["redirect"]);

  return (
    `<form class="fs-lp-form"${attrs({
      id: anchor,
      method: "post",
      action: o.formAction ?? FORM_ACTION,
      "data-fs-form": true,
      "data-fs-success": success,
      "data-fs-redirect": redirect,
    })}>` +
    `<h3 class="fs-lp-form-t">${esc(ltext(p["title"], lang))}</h3>` +
    body +
    `<button class="fs-lp-submit" type="submit">${esc(ltext(p["submitLabel"], lang))}</button>` +
    (success ? `<p class="fs-lp-ok" data-fs-form-success hidden>${escLines(success)}</p>` : "") +
    `</form>`
  );
}

/* ----------------------------------------------------------------- listings */

/**
 * Marketplace listings are the one element we cannot finish at publish time —
 * live inventory needs the 4Sale listings API.
 *
 * So we publish the block's chrome (title, active filters) plus an empty,
 * correctly-sized slot carrying the filter configuration as `data-fs-*`. The
 * host replaces the slot's contents with real listings. The placeholder cards
 * keep the layout visible if it never does.
 */
function serializeListings(el: PageElement, o: SerializeOptions): string {
  const p = el.props;
  const count = Math.max(1, Math.min(12, num(p["count"], 4)));
  const filters = [p["category"], p["make"], p["model"], p["area"]]
    .map((v) => str(v))
    .filter(Boolean);
  const title = esc(ltext(p["title"], o.lang));

  const chips = filters.length
    ? `<div class="fs-lp-chips">${filters.map((f) => `<span class="fs-lp-chip">${esc(f)}</span>`).join("")}</div>`
    : "";

  const placeholders = Array.from({ length: count })
    .map(
      () =>
        `<div class="fs-lp-lst-ph"><div class="fs-lp-lst-ph-m"></div>` +
        `<div class="fs-lp-lst-ph-b"><span></span><span></span></div></div>`,
    )
    .join("");

  return (
    `<section class="fs-lp-lst"${attrs({
      "data-fs-listings": true,
      "data-fs-category": str(p["category"]),
      "data-fs-make": str(p["make"]),
      "data-fs-model": str(p["model"]),
      "data-fs-area": str(p["area"]),
      "data-fs-count": count,
    })}>` +
    (title || chips
      ? `<div class="fs-lp-lst-head">${title ? `<h3 class="fs-lp-h3">${title}</h3>` : ""}${chips}</div>`
      : "") +
    `<div class="fs-lp-lst-grid" data-fs-listings-slot>${placeholders}</div>` +
    `</section>`
  );
}

/* --------------------------------------------------------------- containers */

function serializeContainer(c: Container, o: SerializeOptions): string {
  const expected = COLUMN_COUNT[c.layout];
  const columns = Array.from({ length: expected }, (_, i) => c.columns[i] ?? []);

  const inner = columns
    .map(
      (col) => `<div class="fs-lp-col">${col.map((el) => serializeElement(el, o)).join("")}</div>`,
    )
    .join("");

  const vAlign = c.align === "center" ? "fs-lp-va-center" : c.align === "end" ? "fs-lp-va-end" : "";

  // A custom background is per-container data (a hex value or an image URL), so
  // it cannot live in the shared stylesheet the way the presets do — it is
  // inlined on the section instead, and the preset class is dropped.
  const custom = hasCustomBg(c);
  const scrim = overlayStyle(c);
  // Background images take the same absolute-URL treatment as element images:
  // a relative path resolves against this app, not the host page.
  const resolved =
    c.bg?.type === "image"
      ? { ...c, bg: { ...c.bg, src: resolveAssetUrl(c.bg.src, o.assetOrigin) } }
      : c;
  const bgCss = custom
    ? `;${toCssText(backgroundStyle(resolved))};color:${TONE_COLOR[resolveTone(c)]}`
    : "";

  return (
    `<section class="${cls("fs-lp-sec", custom ? "fs-lp-bg-custom" : `fs-lp-bg-${c.background}`)}"` +
    ` style="padding-block:${num(c.paddingY, 0)}px${c.radius ? `;border-radius:${num(c.radius, 0)}px` : ""}${bgCss}">` +
    (scrim ? `<div class="fs-lp-scrim" style="${toCssText({ backgroundColor: scrim.backgroundColor })}"></div>` : "") +
    `<div class="${cls("fs-lp-wrap", `fs-lp-w-${c.contentWidth}`)}">` +
    `<div class="${cls("fs-lp-grid", `fs-lp-l-${c.layout}`, vAlign)}" style="gap:${num(c.gap, 0)}px">` +
    inner +
    `</div></div></section>`
  );
}

/**
 * Serializes a whole page for one language.
 *
 * The `.fs-lp` root carries `dir` and `lang` so the fragment is self-contained:
 * the stylesheet's RTL rules and logical properties both key off this element,
 * and dropping it into any page produces correct Arabic without the host
 * needing to set direction itself.
 */
export function serializePage(containers: Container[], o: SerializeOptions): string {
  const dir = o.lang === "ar" ? "rtl" : "ltr";
  const body = containers.map((c) => serializeContainer(c, o)).join("");
  return `<div class="fs-lp" dir="${dir}" lang="${o.lang}">${body}</div>`;
}
