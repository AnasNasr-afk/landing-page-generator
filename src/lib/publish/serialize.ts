import {
  COLUMN_COUNT,
  type Container,
  type Cta,
  type FormField,
  type Lang,
  type LText,
  type PageElement,
  ICON_TONE_HEX,
  iconStyle,
  iconTone,
  iconsLayout,
  iconsSize,
  containerDirection,
  containerTracks,
  tracksCss,
  t,
  textWeight,
} from "@/lib/builder-types";
import { IMAGE_MAP } from "@/lib/builder-content";
import {
  ACTION_LABEL,
  CONTACT_DIALOG,
  type Listing,
  filtersToQuery,
  listingDetailsUrl,
  listingPhoneDigits,
  listingPhoneDisplay,
  readCardCtas,
  readCategoryPath,
  readFilterValues,
  readKeyword,
  readListingItems,
} from "@/lib/listings-api";
import {
  TONE_COLOR,
  backgroundStyle,
  ctaVariant,
  hasCustomBg,
  overlayStyle,
  resolveTextColor,
  resolveTone,
  toCssText,
} from "@/lib/container-bg";
import { ctaAction, ctaIcon, ctaRadius } from "@/lib/cta";
import { isDirectionalIcon } from "@/lib/icon-name";
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
 *   Interactivity is therefore CSS-only (`<details>`, `:target`, native form
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
    icon: c.icon,
    radius: c.radius,
    variant: c.variant ?? "primary",
  };
}

/**
 * Call / WhatsApp window. CSS `:target` because published HTML cannot run
 * script — opening is `href="#id"`, closing is `href="#!"`.
 */
function contactDialogHtml(opts: {
  id: string;
  title: string;
  closeLabel: string;
  icon: "phone" | "whatsapp";
  tone: "call" | "wa";
  href: string;
  number: string;
}): string {
  return (
    `<div id="${esc(opts.id)}" class="fs-lp-contact">` +
    `<a class="fs-lp-contact-scrim" href="#!" tabindex="-1" aria-hidden="true"></a>` +
    `<div class="fs-lp-contact-box" role="dialog" aria-label="${esc(opts.title)}">` +
    `<div class="fs-lp-contact-h">` +
    `<p class="fs-lp-contact-t">${esc(opts.title)}</p>` +
    `<a class="fs-lp-contact-x" href="#!" aria-label="${esc(opts.closeLabel)}">${iconSvg("close")}</a>` +
    `</div>` +
    `<a class="fs-lp-contact-row" href="${esc(opts.href)}"${
      opts.tone === "wa" ? ` target="_blank" rel="noreferrer noopener"` : ""
    }>` +
    `<span class="fs-lp-contact-ic fs-lp-contact-ic-${opts.tone}">${iconSvg(opts.icon)}</span>` +
    `<span dir="ltr">${esc(opts.number)}</span>` +
    `</a>` +
    `</div></div>`
  );
}

/** `scroll` CTAs target an anchor on the same page; everything else is a URL. */
function ctaHref(cta: Cta, action: Cta["action"]): string {
  const dest = cta.destination.trim();
  if (action === "scroll") return dest.startsWith("#") ? dest : `#${dest || "lead-form"}`;
  return dest || "#";
}

function ctaHtml(cta: Cta, lang: Lang): string {
  // Read from the destination rather than trusted from storage, so a CTA saved
  // before the action became derived still gets the right target and rel.
  const action = ctaAction(cta.destination, cta.action);
  const external = action === "external";
  // `null` is a text-only button — the majority of q84sale.com's own.
  const name = ctaIcon(cta);
  const icon = name
    ? iconSvg(name, cls("fs-lp-ic", isDirectionalIcon(name) && "fs-lp-ic-dir"))
    : "";
  // Colour comes from the stylesheet; only the radius is inlined, because it is
  // a per-button value an editor drags rather than a design-system constant.
  return `<a class="${cls("fs-lp-cta", `fs-lp-cta-${ctaVariant(cta.variant)}`)}" style="border-radius:${ctaRadius(cta.radius)}px"${attrs(
    {
      href: ctaHref(cta, action),
      target: external ? "_blank" : undefined,
      rel: external ? "noopener noreferrer" : undefined,
      // The host site's analytics (Amplitude) reads these; we cannot ship a
      // click handler because injected scripts don't run.
      "data-fs-event": cta.event,
      "data-fs-action": action,
    },
  )}>${esc(ltext(cta.label, lang))}${icon}</a>`;
}

/* ----------------------------------------------------------------- elements */

function serializeElement(el: PageElement, o: SerializeOptions): string {
  const p = el.props;
  const lang = o.lang;

  switch (el.type) {
    case "heading": {
      const level = str(p["level"], "h2");
      const tag = level === "h1" ? "h1" : level === "h3" ? "h3" : "h2";
      const color = resolveTextColor(p["tone"]);
      return `<${tag} class="${cls(`fs-lp-${tag}`, alignCls(p["align"]))}"${
        color ? ` style="color:${esc(color)}"` : ""
      }>${escLines(ltext(p["text"], lang))}</${tag}>`;
    }

    case "text": {
      // `.fs-lp-p` softens body copy to 80% opacity; an explicitly chosen colour
      // overrides that so it renders exactly as picked. Matches the canvas.
      const color = resolveTextColor(p["tone"]);
      const weight = textWeight(p["weight"]) === "bold" ? "fs-lp-fw-bold" : "fs-lp-fw-regular";
      return `<p class="${cls("fs-lp-p", weight, alignCls(p["align"]))}"${
        color ? ` style="color:${esc(color)};opacity:1"` : ""
      }>${escLines(ltext(p["text"], lang))}</p>`;
    }

    case "image": {
      // Seeded content stores sentinels ("__hero__") that map to bundled
      // assets; the canvas resolves them the same way via IMAGE_MAP.
      const raw = str(p["src"]);
      const src = resolveAssetUrl(IMAGE_MAP[raw] ?? raw, o.assetOrigin);
      const height = num(p["height"], 300);
      const alt = esc(ltext(p["alt"], lang));
      const inner = src
        ? `<img class="fs-lp-img" src="${esc(src)}" alt="${alt}" style="height:${height}px" loading="lazy" decoding="async">`
        : `<div class="fs-lp-imgph" style="height:${height}px">${iconSvg("imagePlus")}<span>Image placeholder</span></div>`;
      return `<div class="${cls("fs-lp-row", justifyCls(p["align"]))}">${inner}</div>`;
    }

    case "video": {
      const caption = esc(ltext(p["label"], lang));
      return `<div class="fs-lp-video">${iconSvg("playCircle")}${
        caption ? `<span class="fs-lp-video-c">${caption}</span>` : ""
      }</div>`;
    }

    case "cards": {
      const items = list<{ icon?: string; title?: LText; body?: LText }>(p["items"]);
      if (!items.length) return "";
      // Chip colours are a per-block choice, so they are inlined here the same
      // way the icon row inlines its own — the stylesheet keeps the geometry.
      const cardStyle = iconStyle(p["style"], "soft");
      const cardTone = ICON_TONE_HEX[iconTone(p["tone"])];
      const chip =
        cardStyle === "plain"
          ? `color:${cardTone.fg}`
          : cardStyle === "soft"
            ? `background:${cardTone.soft};color:${cardTone.base}`
            : `background:${cardTone.fg};color:#ffffff`;
      const cardIcon = (n: string) =>
        iconSvg(n, cls("fs-lp-ic", isDirectionalIcon(n) && "fs-lp-ic-dir"));
      const cards = items
        .map(
          (c) =>
            `<article class="fs-lp-card">` +
            `<div class="fs-lp-card-ic" style="${chip}">${cardIcon(str(c.icon, "badgeCheck"))}</div>` +
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
      const layout = iconsLayout(p["layout"]);
      const size = iconsSize(p["size"]);
      const style = iconStyle(p["style"]);
      const tone = ICON_TONE_HEX[iconTone(p["tone"])];
      /*
       * Size and tone are per-block choices an editor drags and clicks, so
       * unlike everything else here they cannot live in the shared stylesheet
       * and are inlined. Kept in step with the canvas: the label is set at the
       * icon's own size, and a chip pads the glyph by half its size again.
       */
      const pad = style === "plain" ? 0 : Math.round(size * 0.5);
      const box = size + pad * 2;
      const chipStyle =
        `width:${box}px;height:${box}px;` +
        (style === "plain"
          ? `color:${tone.fg}`
          : style === "soft"
            ? `background:${tone.soft};color:${tone.base}`
            : `background:${tone.fg};color:#ffffff`);
      const glyphStyle = `width:${size}px;height:${size}px`;
      const labelStyle = `font-size:${size}px;line-height:1.4`;
      return `<div class="${cls("fs-lp-icons", layout === "list" && "fs-lp-icons-list")}">${items
        .map(
          (i) =>
            `<span class="fs-lp-icons-i">` +
            `<span class="fs-lp-icons-c" style="${chipStyle}">` +
            `${iconSvg(str(i.icon, "check"), cls("fs-lp-ic", isDirectionalIcon(str(i.icon, "check")) && "fs-lp-ic-dir"), glyphStyle)}</span>` +
            `<span style="${labelStyle}">${esc(ltext(i.label, lang))}</span></span>`,
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
 * So we publish the block's chrome (the title) plus an empty,
 * correctly-sized slot carrying the filter configuration as `data-fs-*`. The
 * host replaces the slot's contents with real listings. The placeholder cards
 * keep the layout visible if it never does.
 */
function serializeListings(el: PageElement, o: SerializeOptions): string {
  const p = el.props;
  const count = Math.max(1, Math.min(12, num(p["count"], 4)));
  const path = readCategoryPath(p["categoryPath"]);
  const keyword = readKeyword(p["keyword"]).trim();
  const leaf = path[path.length - 1];
  const items = readListingItems(p["items"]);
  const title = esc(ltext(p["title"], o.lang));
  const lang = o.lang;

  /**
   * A listing card, in the same shape q84sale.com renders.
   *
   * Keep this in step with `ListingCard` in `renderer.tsx` — same five rows,
   * same rules about which badge appears — since the two are independent
   * readers of one listing and any drift shows up as the preview and the
   * published page disagreeing.
   *
   * The host may replace the slot's contents entirely with its own SDUI cards;
   * this markup exists so a page still looks right if it doesn't, and so the
   * listings an editor curated are visible to a crawler as real text rather
   * than a skeleton.
   */
  const cardCtas = readCardCtas(p["cardCtas"]);

  const card = (l: Listing, lang: Lang, i: number): string => {
    const title = t(l.title, lang);
    const sub = l.specs ? t(l.specs, lang) : t(l.area, lang);
    const phone = listingPhoneDigits(l.phone);
    const display = listingPhoneDisplay(phone);
    const details = listingDetailsUrl(l, lang);
    const closeLabel = lang === "ar" ? "إغلاق" : "Close";
    const callId = `fs-c-${el.id}-${i}-${l.id}`;
    const waId = `fs-w-${el.id}-${i}-${l.id}`;

    /*
     * The carousel, minus its arrows.
     *
     * The canvas runs a real one on React state; a published page has no
     * script, so the slides go into a scroll-snapping track instead. Swiping
     * and trackpad scrolling still page through the photos, which is how most
     * people use it, and the last frame is the grey "See more" placeholder. The
     * arrows are left out rather than drawn dead — they are hover-only in the
     * real app and hidden outright on touch, so their absence here reads as
     * the mobile treatment rather than as something broken.
     */
    // Only more than one photo earns a carousel — a single-image listing gets a
    // bare thumbnail, the same check the real card makes.
    const photos = (l.thumbs?.length ?? 0) > 1 ? (l.thumbs ?? []) : [];
    const seeMoreLabel = lang === "ar" ? "شاهد المزيد" : "See more";
    const slides = photos.length
      ? `<div class="fs-lp-lst-track">` +
        photos
          .map(
            (src) =>
              `<div class="fs-lp-lst-slide">` +
              `<img src="${esc(src)}" alt="${esc(title)}" loading="lazy" decoding="async">` +
              `</div>`,
          )
          .join("") +
        `<div class="fs-lp-lst-slide">` +
        (details
          ? `<a class="fs-lp-lst-more" href="${esc(details)}" target="_blank" rel="noreferrer noopener">${iconSvg("image", "fs-lp-lst-more-ic")}<span>${esc(seeMoreLabel)}</span></a>`
          : `<span class="fs-lp-lst-more">${iconSvg("image", "fs-lp-lst-more-ic")}<span>${esc(seeMoreLabel)}</span></span>`) +
        `</div>` +
        `</div>`
      : l.image
        ? `<img src="${esc(l.image)}" alt="${esc(title)}" loading="lazy" decoding="async">`
        : "";

    const dots =
      photos.length > 0
        ? `<span class="fs-lp-lst-dots">` +
          Array.from(
            { length: photos.length + 1 },
            (_, i) => `<i${i === 0 ? ` class="on"` : ""}></i>`,
          ).join("") +
          `</span>`
        : "";

    // Featured is the gold crown plus the word. Pinned is the red thumbtack
    // in a circle — not the verified check, which is a different badge.
    const tags =
      l.featured || l.pinned
        ? `<div class="fs-lp-lst-tags">` +
          (l.pinned ? `<span class="fs-lp-lst-tag fs-lp-lst-tag-pin">${iconSvg("pin")}</span>` : "") +
          (l.featured
            ? `<span class="fs-lp-lst-tag">${iconSvg("featured")}` +
              `<span>${esc(lang === "ar" ? "مميز" : "Featured")}</span></span>`
            : "") +
          `</div>`
        : "";

    const media = `<div class="fs-lp-lst-media">${slides}${tags}${dots}</div>`;

    /*
     * The card is an `<article>`, never an `<a>`, and the title carries the
     * link instead. The contact row contains anchors of its own, and an anchor
     * inside an anchor is invalid HTML that browsers silently unnest — which
     * would break the card's layout in the published page only, where it is
     * hardest to notice. A linked title still gives a crawler a crawlable
     * listing link, with better anchor text than the whole card.
     */
    const heading = details
      ? `<a class="fs-lp-lst-t" href="${esc(details)}" target="_blank" rel="noreferrer noopener">${esc(title)}</a>`
      : `<span class="fs-lp-lst-t">${esc(title)}</span>`;

    // Call / WhatsApp open a CSS `:target` window (no script on publish).
    // Chat and Favourite go to the listing on q84sale.com — a landing page
    // cannot start an in-app session.
    const actions =
      cardCtas && (phone || details)
        ? `<div class="fs-lp-lst-acts">` +
          (phone
            ? `<a class="fs-lp-lst-act fs-lp-lst-act-call" href="#${esc(callId)}" aria-label="${esc(t(ACTION_LABEL.call, lang))}">` +
              `${iconSvg("phone")}<span class="fs-lp-lst-lbl">${esc(t(ACTION_LABEL.call, lang))}</span></a>`
            : "") +
          (phone
            ? `<a class="fs-lp-lst-act fs-lp-lst-act-wa" href="#${esc(waId)}" aria-label="${esc(t(ACTION_LABEL.whatsapp, lang))}">` +
              `${iconSvg("whatsapp")}<span class="fs-lp-lst-lbl">${esc(t(ACTION_LABEL.whatsapp, lang))}</span></a>`
            : "") +
          (details
            ? `<a class="fs-lp-lst-act fs-lp-lst-act-chat" href="${esc(details)}" target="_blank" rel="noreferrer noopener" aria-label="${esc(t(ACTION_LABEL.chat, lang))}">` +
              `${iconSvg("chat")}<span class="fs-lp-lst-lbl">${esc(t(ACTION_LABEL.chat, lang))}</span></a>`
            : "") +
          `</div>`
        : "";

    const dialogs =
      cardCtas && phone
        ? contactDialogHtml({
            id: callId,
            title: t(CONTACT_DIALOG.call, lang),
            closeLabel,
            icon: "phone",
            tone: "call",
            href: `tel:${display}`,
            number: display,
          }) +
          contactDialogHtml({
            id: waId,
            title: t(CONTACT_DIALOG.whatsapp, lang),
            closeLabel,
            icon: "whatsapp",
            tone: "wa",
            href: `https://wa.me/${phone}`,
            number: display,
          })
        : "";

    const body =
      `<div class="fs-lp-lst-body">` +
      // Not `fs-lp-lst-head` — that class is the listings block's own header.
      `<div class="fs-lp-lst-tr"><div class="fs-lp-lst-tw">${heading}</div>` +
      (cardCtas && details
        ? `<a class="fs-lp-lst-fav" href="${esc(details)}" target="_blank" rel="noreferrer noopener" aria-label="${esc(lang === "ar" ? "تفاصيل الإعلان" : "Listing details")}">${iconSvg("heart")}</a>`
        : "") +
      `</div>` +
      (sub ? `<p class="fs-lp-lst-sub">${esc(sub)}</p>` : "") +
      `<div class="fs-lp-lst-row">` +
      `<p class="fs-lp-lst-price">${esc(t(l.price, lang))}</p>` +
      (l.since ? `<p class="fs-lp-lst-since">${esc(t(l.since, lang))}</p>` : "") +
      `</div>` +
      actions +
      `</div>`;

    return `<article class="fs-lp-lst-card">${media}${body}${dialogs}</article>`;
  };

  const cards = items.length
    ? items
        .slice(0, count)
        .map((l, i) => card(l, lang, i))
        .join("")
    : Array.from({ length: count })
        .map(
          () =>
            `<div class="fs-lp-lst-card fs-lp-lst-ph"><div class="fs-lp-lst-media"></div>` +
            `<div class="fs-lp-lst-ph-b"><span></span><span></span></div></div>`,
        )
        .join("");

  return (
    `<section class="fs-lp-lst"${attrs({
      "data-fs-listings": true,
      // The leaf is what the host queries; the full path is carried alongside
      // it so a breadcrumb can be rebuilt without a second lookup.
      "data-fs-category": leaf ? leaf.id : str(p["category"]),
      "data-fs-category-path": path.map((c) => c.id).join("/"),
      // Free-text search. Stands alone — a block can carry a keyword and no
      // category at all, so the host must not treat an empty category as
      // "nothing to query".
      "data-fs-keyword": keyword,
      // Applied facets, already in the query-string form the listings API
      // takes, so the host can forward it without re-encoding.
      "data-fs-filters": filtersToQuery(readFilterValues(p["filters"])),
      // The exact listings the editor curated. A host that wants the block
      // frozen resolves these ids; one that wants it live ignores them and
      // re-runs the category + filters above.
      "data-fs-listing-ids": items.map((l) => l.id).join(","),
      "data-fs-make": str(p["make"]),
      "data-fs-model": str(p["model"]),
      "data-fs-area": str(p["area"]),
      "data-fs-count": count,
    })}>` +
    (title ? `<div class="fs-lp-lst-head"><h3 class="fs-lp-h3">${title}</h3></div>` : "") +
    `<div class="fs-lp-lst-grid" data-fs-listings-slot>${cards}</div>` +
    // The block's own button, below the grid. Separate from the contact
    // buttons on each card: this one is a link out, usually to full results.
    (p["cta"] ? `<div class="fs-lp-lst-cta">${ctaHtml(readCta(p["cta"]), lang)}</div>` : "") +
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
  const vertical = containerDirection(c.direction) === "vertical";
  const tracks = containerTracks(c);
  const minH = num(c.minHeight, 0);

  // A background image is per-container data, so it cannot live in the shared
  // stylesheet the way the 4Sale presets do — it is inlined on the section
  // instead, and the preset class is dropped. A leftover hex colour is ignored.
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
  const minCss = minH ? `;min-height:${minH}px` : "";

  return (
    `<section class="${cls("fs-lp-sec", custom ? "fs-lp-bg-custom" : `fs-lp-bg-${c.background}`)}"` +
    ` style="padding-block:${num(c.paddingY, 0)}px${c.radius ? `;border-radius:${num(c.radius, 0)}px` : ""}${minCss}${bgCss}">` +
    (scrim
      ? `<div class="fs-lp-scrim" style="${toCssText({ backgroundColor: scrim.backgroundColor })}"></div>`
      : "") +
    `<div class="${cls("fs-lp-wrap", `fs-lp-w-${c.contentWidth}`)}">` +
    `<div class="${cls("fs-lp-grid", vertical && "fs-lp-dir-v", tracks.length > 1 && "fs-lp-split", vAlign)}" style="gap:${num(c.gap, 0)}px;--fs-tracks:${tracksCss(tracks)}">` +
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
