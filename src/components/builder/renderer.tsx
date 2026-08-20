import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  type Container,
  type Cta,
  type FormField,
  type Lang,
  type LText,
  type PageElement,
  ICON_TONE_CLASS,
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
import { FS_ICONS, type FsIconName } from "@/lib/fs-icons";
import { UiIcon } from "./ui-icon";
import { ctaIcon, ctaRadius } from "@/lib/cta";
import { isDirectionalIcon, resolveIconName } from "@/lib/icon-name";
import {
  ACTION_LABEL,
  CONTACT_DIALOG,
  type Listing,
  listingDetailsUrl,
  listingPhoneDigits,
  listingPhoneDisplay,
  readCardCtas,
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
} from "@/lib/container-bg";

/**
 * An icon, drawn from 4Sale's own set.
 *
 * `name` is free text out of page data, so it goes through `resolveIconName`,
 * which maps the Lucide names older pages still carry onto their 4Sale
 * equivalents and never returns nothing. Single-colour icons inherit
 * `currentColor`; the gold `featured` crown keeps its own fills.
 *
 * Sizing is the caller's job — a utility class for fixed sizes, or `style` where
 * the size is a value an editor drags, which utility classes cannot express.
 */
export function Icon({
  name,
  className,
  style,
}: {
  name: string;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
}) {
  return <FsIconView name={resolveIconName(name)} className={className} style={style} />;
}

function FsIconView({
  name,
  className,
  style,
}: {
  name: FsIconName;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
}) {
  const icon = FS_ICONS[name];
  return (
    <svg viewBox={icon.viewBox} className={className} style={style} aria-hidden focusable="false">
      {icon.paths.map((p, i) => (
        <path key={i} d={p.d} fill={"fill" in p ? p.fill : "currentColor"} />
      ))}
    </svg>
  );
}

/**
 * Props spread onto a text node to make it editable in place.
 *
 * `path` is a dotted path into the element's props (`"text"`, `"cta.label"`,
 * `"items.1.title"`), resolved by `setLocalizedText`.
 */
export type EditBind = (path: string, opts?: { multiline?: boolean }) => Record<string, unknown>;

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
const COL_STACK = "grid-cols-1 @min-[768px]:[grid-template-columns:var(--fs-tracks)]";

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
  // Radius is inline because it is a value an editor drags; everything else
  // about the button comes from the palette classes below.
  const base =
    "inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-all active:scale-[0.98]";
  const variants: Record<string, string> = {
    primary: "bg-brand text-brand-foreground shadow-brand hover:bg-brand-strong",
    secondary: "bg-brand-soft text-brand border border-brand/20 hover:bg-brand-soft/70",
    inverse: "bg-background text-brand hover:bg-background/90",
  };
  // `null` means the editor chose a text-only button, which is what most of
  // q84sale.com's own buttons are.
  const icon = ctaIcon(cta);
  return (
    <button
      type="button"
      onClick={() => onFire?.(cta)}
      className={cn(base, variants[ctaVariant(cta.variant)])}
      style={{ borderRadius: ctaRadius(cta.radius) }}
    >
      <span {...(bind && labelPath ? bind(labelPath) : {})}>{t(cta.label, lang)}</span>
      {icon && (
        /*
          Horizontal icons mirror in Arabic — an arrow means "forward", and in
          an RTL page forward is leftward. `scale-x` rather than `rotate-180`
          so an icon that is not vertically symmetric still flips correctly.
        */
        <Icon name={icon} className={cn("size-4", isDirectionalIcon(icon) && "rtl:-scale-x-100")} />
      )}
    </button>
  );
}

/**
 * A listing card, built to match `StackedCard` in the 4Sale web app.
 *
 * Five rows: the photo (carousel dots and the tag rail for Featured / Pinned),
 * the title paired with a favourite button, the specification line, the price
 * paired with the listing's age, and the contact actions.
 *
 * Measurements are the real component's, not estimates — `StackedCard.module.scss`
 * for geometry, `_typo.scss` for the type scale, `_elevation.scss` for the
 * outline, `_colors.css` for every colour. Two that are easy to get wrong:
 *
 * - the outline is `el-lvl-1`, a **1px `neutral_100` ring drawn as a box-shadow**
 *   with no drop shadow at rest, not a border. Hover raises it to `el-lvl-4`.
 * - the contact buttons are `flex: 1 1 auto` with a 4px gap, so they size to
 *   their labels and then share the slack. `flex-1` (basis 0) would force Call,
 *   WhatsApp and Chat to equal widths, which the real row never does.
 *
 * The favourite button and Chat open the listing on q84sale.com. Call and
 * WhatsApp open the contact window; the number in that window is the real
 * `tel:` / `wa.me` link.
 */
function ListingCard({
  listing,
  lang,
  cardCtas,
}: {
  listing: Listing;
  lang: Lang;
  cardCtas: boolean;
}) {
  const title = t(listing.title, lang);
  // The real card prints the specification line here. `area` stands in when a
  // category's attributes did not resolve, so the row still says something
  // rather than collapsing and shortening this card out of line with its row.
  const sub = listing.specs ? t(listing.specs, lang) : t(listing.area, lang);
  const details = listingDetailsUrl(listing, lang);

  return (
    <article className="@container/card relative flex h-full min-w-0 flex-col justify-between rounded-2xl bg-background shadow-fs-1 transition-all duration-300 hover:shadow-fs-4 motion-reduce:transition-none">
      <ListingMedia listing={listing} lang={lang} title={title} />

      {/* content: 12px padding, 6px between rows. */}
      <div className="flex flex-col gap-1.5 rounded-b-2xl p-3">
        <div className="flex justify-between">
          {/* `.h6` is bold 16/24; the title truncates to one line. */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-base/6 font-bold text-fs-neutral-900">{title}</p>
          </div>
          {/* Same toggle as the contact row. On 4Sale this opens the listing,
              because a landing page cannot add a favourite in-app. */}
          {cardCtas && details && (
            <a
              href={details}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={lang === "ar" ? "تفاصيل الإعلان" : "Listing details"}
              onClick={(e) => e.stopPropagation()}
              className="ms-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-fs-neutral-50 text-fs-neutral-900 @max-[240px]/card:size-8"
            >
              <FsIconView name="heart" className="size-5" />
            </a>
          )}
        </div>

        {/* `.text-5-med` — medium 14/20, `neutral_600`, one line. */}
        {sub && <p className="h-5 truncate text-sm/5 font-medium text-fs-neutral-600">{sub}</p>}

        <div className="flex items-center justify-between gap-1">
          {/* `.h6 .text-prim_4sale_500` in a fixed 24px row. */}
          <p className="h-6 min-w-0 flex-1 truncate text-base/6 font-bold text-brand">
            {t(listing.price, lang)}
          </p>
          {/* `.text-6-med` — medium 12/16, `neutral_600`. */}
          {listing.since && (
            <p className="min-w-0 truncate text-xs/4 font-medium text-fs-neutral-600">
              {t(listing.since, lang)}
            </p>
          )}
        </div>

        {cardCtas && <ListingActions listing={listing} lang={lang} />}
      </div>
    </article>
  );
}

/**
 * The photo area: carousel, tag rail and dots.
 *
 * The carousel pages through `thumbs` and ends on a "See more" slide — a
 * grey placeholder with an image icon, not a dimmed copy of the last photo.
 * Arrows appear on hover, sit 12px in from each edge, and the one at the end
 * of its travel is hidden rather than disabled.
 *
 * Only the canvas gets the working version. A published page carries no
 * `<script>`, so `serialize.ts` emits the same slides in a scroll-snapping
 * track instead: swiping still works, and the arrows — which the real app
 * hides on touch anyway — are left out rather than drawn dead.
 */
function ListingMedia({ listing, lang, title }: { listing: Listing; lang: Lang; title: string }) {
  /*
   * Slides 0..n-1 are photos, and the last one is the "See more" frame.
   *
   * A carousel is only built when there is more than one photo — the real card
   * checks `thumbs.length > 1` and otherwise renders a bare thumbnail with no
   * dots, no arrows and no trailing frame. A single-photo card that still
   * offered a "See more" slide would be inventing a second image.
   */
  const photos = (listing.thumbs?.length ?? 0) > 1 ? (listing.thumbs ?? []) : [];
  const slides = photos.length ? photos.length + 1 : 0;
  const [slide, setSlide] = useState(0);
  const seeMore = slides > 0 && slide === slides - 1;
  const shown = seeMore ? null : slides > 0 ? photos[slide] : listing.image;
  const details = listingDetailsUrl(listing, lang);
  const moreLabel = lang === "ar" ? "شاهد المزيد" : "See more";

  return (
    <div className="group/media relative flex aspect-video items-center justify-center overflow-hidden rounded-t-2xl bg-fs-neutral-100">
      {seeMore ? (
        <a
          href={details || undefined}
          target="_blank"
          rel="noreferrer noopener"
          className="absolute inset-0 z-[6] flex flex-col items-center justify-center gap-2 bg-fs-neutral-500 text-xs/4 font-medium text-white"
        >
          <FsIconView name="image" className="size-8 text-fs-neutral-900/50" />
          <span>{moreLabel}</span>
        </a>
      ) : shown ? (
        <img
          src={shown}
          alt={title}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        <Icon name="image" className="size-8 text-fs-neutral-500" />
      )}

      {/* Tag rail: 12px in from the top-start corner, 4px between pills. */}
      {(listing.featured || listing.pinned) && (
        <div className="absolute start-3 top-3 z-[9] flex gap-1">
          {listing.pinned && <ListingTag icon="pin" />}
          {listing.featured && (
            <ListingTag icon="featured" label={lang === "ar" ? "مميز" : "Featured"} />
          )}
        </div>
      )}

      {slides > 1 && (
        <>
          {slide > 0 && <CarouselArrow dir="prev" onClick={() => setSlide((s) => s - 1)} />}
          {slide < slides - 1 && (
            <CarouselArrow dir="next" onClick={() => setSlide((s) => s + 1)} />
          )}
        </>
      )}

      <ListingDots count={slides} active={slide} />
    </div>
  );
}

/**
 * One carousel arrow — a small white circle, revealed when the photo is
 * hovered, 12px in from its edge.
 *
 * `chevronStart` points to the inline start, so the next arrow is the same
 * glyph flipped. `scale-x` rather than `rotate-180` keeps it flipping correctly
 * under RTL, where start and end have already swapped.
 */
function CarouselArrow({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={dir === "prev" ? "Previous photo" : "Next photo"}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-[100] -translate-y-1/2 rounded-full bg-white p-2 opacity-0 shadow-fs-1 transition-opacity group-hover/media:opacity-100",
        // Hover-only, so a touch device would never see them; and on a card
        // this narrow the two would overlap each other anyway.
        "[@media(pointer:coarse)]:hidden @max-[240px]/card:hidden",
        dir === "prev" ? "start-3" : "end-3",
      )}
    >
      <FsIconView
        name="chevronStart"
        className={`size-4 text-fs-neutral-900 ${dir === "next" ? "-scale-x-100" : ""}`}
      />
    </button>
  );
}

/**
 * A pill on the listing photo — the design system's `Tag`, medium size.
 *
 * 20px tall, fully rounded, 12/16 medium. Featured is the gold crown plus
 * the word; Pinned is the red thumbtack in a circle, no label.
 */
function ListingTag({ icon, label }: { icon: FsIconName; label?: string | undefined }) {
  return (
    <span
      className={`inline-flex h-5 items-center rounded-full bg-white text-xs/4 font-medium whitespace-nowrap text-fs-neutral-900 ${
        label ? "px-2" : "size-5 justify-center px-0"
      }`}
    >
      <FsIconView name={icon} className={`size-4 ${label ? "me-1" : ""}`} />
      {label}
    </span>
  );
}

/**
 * Carousel position dots.
 *
 * `count` is already the number of slides the real carousel builds — the
 * `thumbs` array plus its trailing "see more" slide — so this draws it as-is
 * rather than capping. 6px bullets, 2px apart, 4px off the bottom, the active
 * one `prim_500` and the rest solid white.
 */
function ListingDots({ count, active = 0 }: { count: number; active?: number }) {
  if (count < 2) return null;
  return (
    <div className="absolute bottom-1 left-1/2 z-[5] flex max-w-[60%] -translate-x-1/2 gap-1 overflow-hidden @max-[180px]/card:hidden">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`size-1.5 rounded-full ${i === active ? "bg-brand" : "bg-white"}`}
        />
      ))}
    </div>
  );
}

/**
 * The Call / WhatsApp / Chat row.
 *
 * Small toned buttons: 8px/12px padding on a 12/16 label, fully rounded, 4px
 * gap, `flex: 1 1 auto`. Call and Chat are `prim_4sale_50` with `prim_600` ink;
 * WhatsApp is `success_50` with `success_600` — the 600 step in both cases, not
 * the 500 the rest of the card uses.
 *
 * Call and WhatsApp open the same contact window q84sale.com uses — icon plus
 * number — rather than jumping straight to `tel:` / `wa.me`. Chat and Favourite
 * cannot start an in-app session from a landing page, so they open the listing
 * on 4Sale instead.
 *
 * Labels drop under either a narrow page or a narrow card — see ACTION_LABEL_AT.
 */
const ACTION_PILL =
  "inline-flex min-w-0 flex-auto items-center justify-center gap-1 overflow-hidden rounded-full px-3 py-2 text-xs/4 font-bold";

/** Labels appear once a card is wide enough to seat all three without crowding. */
const ACTION_LABEL_AT = "@max-[1200px]/page:hidden @max-[260px]/card:hidden";

function ListingActions({ listing, lang }: { listing: Listing; lang: Lang }) {
  const phone = listingPhoneDigits(listing.phone);
  const details = listingDetailsUrl(listing, lang);
  const [dialog, setDialog] = useState<"call" | "wa" | null>(null);
  if (!phone && !details) return null;

  return (
    <div className="my-1.5 flex gap-1">
      {phone && (
        <button
          type="button"
          aria-label={t(ACTION_LABEL.call, lang)}
          onClick={(e) => {
            e.stopPropagation();
            setDialog("call");
          }}
          className={`${ACTION_PILL} bg-brand-soft text-fs-prim-600`}
        >
          <FsIconView name="phone" className="size-4" />
          <span className={ACTION_LABEL_AT}>{t(ACTION_LABEL.call, lang)}</span>
        </button>
      )}
      {phone && (
        <button
          type="button"
          aria-label={t(ACTION_LABEL.whatsapp, lang)}
          onClick={(e) => {
            e.stopPropagation();
            setDialog("wa");
          }}
          className={`${ACTION_PILL} bg-fs-success-50 text-fs-success-600`}
        >
          <FsIconView name="whatsapp" className="size-4" />
          <span className={ACTION_LABEL_AT}>{t(ACTION_LABEL.whatsapp, lang)}</span>
        </button>
      )}
      {details && (
        <a
          href={details}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={t(ACTION_LABEL.chat, lang)}
          onClick={(e) => e.stopPropagation()}
          className={`${ACTION_PILL} bg-brand-soft text-fs-prim-600`}
        >
          <FsIconView name="chat" className="size-4" />
          <span className={ACTION_LABEL_AT}>{t(ACTION_LABEL.chat, lang)}</span>
        </a>
      )}
      {dialog && phone && (
        <ContactDialog kind={dialog} phone={phone} lang={lang} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}

/**
 * The Call / WhatsApp window from q84sale.com: title, close, then a row with
 * a round icon and the number. The number itself is the `tel:` or `wa.me` link.
 *
 * Portaled to `document.body` so the canvas `overflow-hidden` does not clip it.
 */
function ContactDialog({
  kind,
  phone,
  lang,
  onClose,
}: {
  kind: "call" | "wa";
  phone: string;
  lang: Lang;
  onClose: () => void;
}) {
  const display = listingPhoneDisplay(phone);
  const href = kind === "call" ? `tel:${display}` : `https://wa.me/${phone}`;
  const title = t(CONTACT_DIALOG[kind === "call" ? "call" : "whatsapp"], lang);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(10,18,67,0.45)] p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        dir={lang === "ar" ? "rtl" : "ltr"}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-2xl bg-background px-6 py-5 shadow-fs-4"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-lg font-bold text-fs-neutral-900">{title}</p>
          <button
            type="button"
            aria-label={lang === "ar" ? "إغلاق" : "Close"}
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-full text-fs-neutral-500 hover:bg-fs-neutral-50 hover:text-fs-neutral-900"
          >
            <FsIconView name="close" className="size-5" />
          </button>
        </div>
        <a
          href={href}
          target={kind === "wa" ? "_blank" : undefined}
          rel={kind === "wa" ? "noreferrer noopener" : undefined}
          className="flex items-center gap-3 text-base font-medium text-fs-neutral-900"
        >
          <span
            className={cn(
              "inline-flex size-10 shrink-0 items-center justify-center rounded-full",
              kind === "call" ? "bg-brand-soft text-brand" : "bg-fs-success-500 text-white",
            )}
          >
            <FsIconView name={kind === "call" ? "phone" : "whatsapp"} className="size-5" />
          </span>
          <span dir="ltr">{display}</span>
        </a>
      </div>
    </div>,
    document.body,
  );
}

/**
 * The unconfigured state, matching the real card's silhouette row for row so
 * the block does not resize once a search is run.
 */
function ListingCardSkeleton({ cardCtas }: { cardCtas: boolean }) {
  return (
    <div className="@container/card flex h-full min-w-0 flex-col justify-between rounded-2xl bg-background shadow-fs-1">
      {/* Every row a real card has, at the same heights, so the block does not
          jump when results land. */}
      <div className="aspect-video rounded-t-2xl bg-fs-neutral-100" />
      <div className="flex flex-col gap-1.5 p-3">
        <div className="flex justify-between">
          <div className="h-6 w-2/3 rounded bg-fs-neutral-100" />
          {cardCtas && (
            <div className="size-10 shrink-0 rounded-full bg-fs-neutral-50 @max-[240px]/card:size-8" />
          )}
        </div>
        <div className="h-5 w-1/2 rounded bg-fs-neutral-100" />
        <div className="h-6 w-1/3 rounded bg-fs-neutral-100" />
        {cardCtas && (
          <div className="my-1.5 flex gap-1">
            <div className="h-8 flex-auto rounded-full bg-fs-neutral-50" />
            <div className="h-8 flex-auto rounded-full bg-fs-neutral-50" />
            <div className="h-8 flex-auto rounded-full bg-fs-neutral-50" />
          </div>
        )}
      </div>
    </div>
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
        level === "h1"
          ? "text-4xl @min-[768px]:text-5xl leading-[1.1]"
          : level === "h2"
            ? "text-3xl"
            : "text-xl",
        alignClass(g<string>("align")),
      );
      // Single-line: Enter commits. Paragraphs pass multiline so Enter breaks.
      const editable = bind("text");
      const color = resolveTextColor(g<string>("tone"));
      const style = color ? { color } : undefined;
      return level === "h1" ? (
        <h1 className={cls} style={style} {...editable}>
          {t(g<LText>("text"), lang)}
        </h1>
      ) : level === "h3" ? (
        <h3 className={cls} style={style} {...editable}>
          {t(g<LText>("text"), lang)}
        </h3>
      ) : (
        <h2 className={cls} style={style} {...editable}>
          {t(g<LText>("text"), lang)}
        </h2>
      );
    }
    case "text": {
      // Body copy is normally softened to 80% opacity. An explicitly chosen
      // colour should render exactly as picked, so the softening is dropped.
      const color = resolveTextColor(g<string>("tone"));
      const weight = textWeight(g<string>("weight"));
      return (
        <p
          className={cn(
            "text-base leading-relaxed",
            weight === "bold" ? "font-bold" : "font-normal",
            !color && "opacity-80",
            alignClass(g<string>("align")),
          )}
          style={color ? { color } : undefined}
          {...bind("text", { multiline: true })}
        >
          {t(g<LText>("text"), lang)}
        </p>
      );
    }
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
              <Icon name="imagePlus" className="me-2 size-5" /> Image placeholder
            </div>
          )}
        </div>
      );
    }
    case "video":
      return (
        <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-neutral-900/90 text-white/80">
          <Icon name="playCircle" className="size-12" />
        </div>
      );
    case "cards": {
      const items = g<{ icon: string; title: LText; body: LText }[]>("items") || [];
      // The icon chip is painted from the palette, using the same three
      // treatments the icon row offers so the two blocks can be tuned to match.
      const cardChip =
        ICON_TONE_CLASS[iconTone(g<string>("tone"))][iconStyle(g<string>("style"), "soft")];
      return (
        // `@container` on the wrapper, so the columns below measure this block
        // rather than the page — a cards block in a narrow column would
        // otherwise still ask for three columns. Same fix as the listings grid.
        <div className="@container/blk">
          <div
            className={cn(
              "grid gap-4 grid-cols-[minmax(0,1fr)]",
              items.length >= 3 ? "@min-[768px]:grid-cols-3" : "@min-[768px]:grid-cols-2",
            )}
          >
            {items.map((c, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-background p-6 text-start shadow-card transition-shadow hover:shadow-lift"
              >
                <div
                  className={cn("flex size-11 items-center justify-center rounded-xl", cardChip)}
                >
                  <Icon
                    name={c.icon}
                    className={cn("size-5", isDirectionalIcon(c.icon) && "rtl:-scale-x-100")}
                  />
                </div>
                <h3 className="mt-4 text-base font-semibold" {...bind(`items.${i}.title`)}>
                  {t(c.title, lang)}
                </h3>
                <p
                  className="mt-1.5 text-sm opacity-70"
                  {...bind(`items.${i}.body`, { multiline: true })}
                >
                  {t(c.body, lang)}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "icons": {
      const items = g<{ icon: string; label: LText }[]>("items") || [];
      const layout = iconsLayout(g<string>("layout"));
      const size = iconsSize(g<number>("size"));
      const style = iconStyle(g<string>("style"));
      const toneClass = ICON_TONE_CLASS[iconTone(g<string>("tone"))][style];
      /*
       * One slider drives the glyph and the label together, so the pair always
       * looks deliberate: the text is set at the icon's own size. A chip pads
       * the glyph by half its size again and is fully rounded, which keeps it
       * circular at every size rather than a square with soft corners.
       */
      const pad = style === "plain" ? 0 : Math.round(size * 0.5);
      const box = size + pad * 2;
      return (
        <div
          className={cn(
            layout === "list" ? "flex flex-col gap-3" : "flex flex-wrap gap-x-6 gap-y-3",
          )}
        >
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 font-medium">
              <span
                className={cn(
                  "inline-flex shrink-0 items-center justify-center rounded-full",
                  toneClass,
                )}
                style={{ width: box, height: box }}
              >
                <Icon
                  name={it.icon}
                  className={cn(isDirectionalIcon(it.icon) && "rtl:-scale-x-100")}
                  style={{ width: size, height: size }}
                />
              </span>
              <span style={{ fontSize: size, lineHeight: 1.4 }} {...bind(`items.${i}.label`)}>
                {t(it.label, lang)}
              </span>
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
      const items = readListingItems(g("items"));

      // Nothing previewed yet: empty placeholder cards keep the block's shape
      // on the canvas, the same reason the published slot ships skeletons.
      const cards = items.slice(0, count);
      const placeholders = items.length ? 0 : count;

      const cardCtas = readCardCtas(g("cardCtas"));

      return (
        <div className="@container/lst">
          <div className="mb-3">
            <h3 className="text-lg font-semibold" {...bind("title")}>
              {t(g<LText>("title"), lang)}
            </h3>
          </div>
          {editing && !items.length && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">
              <UiIcon name="Plug" className="size-3.5" />
              Enter a keyword or pick a category, then run “Show listings”
            </div>
          )}
          {/*
            The site's own breakpoints — 4 columns stepping down at 1200 / 992 /
            768 — measured against **this block**, not the page.

            Keying them off the page was wrong in every case where the block is
            not full width: a listings block inside a 35/65 split, or in a
            section set to `narrow`, still asked for four columns and got 160px
            cards. The block's own width is the only thing that actually decides
            how many cards fit, so that is what is measured. A full-width block
            still breaks exactly where q84sale.com does, because at full width
            the two are the same number.

            `minmax(0,1fr)` rather than `1fr`: a grid track's default minimum is
            `auto`, so a nowrap tag or button row can push a column wider than
            its share and blow the row out instead of shrinking.
          */}
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 @min-[768px]:grid-cols-2 @min-[768px]:gap-6 @min-[992px]:grid-cols-3 @min-[1200px]:grid-cols-4">
            {cards.map((l) => (
              <ListingCard key={l.id} listing={l} lang={lang} cardCtas={cardCtas} />
            ))}
            {Array.from({ length: placeholders }, (_, i) => (
              <ListingCardSkeleton key={`ph-${i}`} cardCtas={cardCtas} />
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
        // See the note on the cards grid: columns follow this block's width.
        <div className="@container/blk">
          <div className="grid gap-4 grid-cols-[minmax(0,1fr)] @min-[768px]:grid-cols-3">
            {items.map((s, i) => (
              <div key={i} className="rounded-2xl bg-neutral-surface p-6">
                <div className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-brand-foreground">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-base font-semibold" {...bind(`items.${i}.title`)}>
                  {t(s.title, lang)}
                </h3>
                <p
                  className="mt-1 text-sm opacity-70"
                  {...bind(`items.${i}.body`, { multiline: true })}
                >
                  {t(s.body, lang)}
                </p>
              </div>
            ))}
          </div>
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
  const custom = hasCustomBg(container);
  const scrim = overlayStyle(container);
  const vertical = containerDirection(container.direction) === "vertical";
  const tracks = containerTracks(container);
  const split = tracks.length > 1;
  return (
    <section
      // A custom background replaces the preset class entirely, including the
      // text colour `bg-brand` bakes in — tone is resolved explicitly instead.
      className={cn(!custom && BG[container.background], className)}
      style={{
        paddingTop: container.paddingY,
        paddingBottom: container.paddingY,
        borderRadius: container.radius,
        ...(container.minHeight ? { minHeight: container.minHeight } : {}),
        ...(custom
          ? {
              ...backgroundStyle(container),
              color: TONE_COLOR[resolveTone(container)],
              position: "relative",
              // Keeps the image and scrim inside a rounded corner.
              overflow: "hidden",
            }
          : {}),
      }}
    >
      {scrim ? <div style={scrim} /> : null}
      <div
        className={cn("mx-auto px-6", WIDTH[container.contentWidth])}
        // Lifts content above the scrim.
        style={custom ? { position: "relative" } : undefined}
      >
        <div
          data-fs-grid
          className={cn(
            "grid items-start",
            vertical ? cn("grid-cols-1", split && "min-h-96") : COL_STACK,
            container.align === "center" && "items-center",
            container.align === "end" && "items-end",
          )}
          style={{
            gap: container.gap,
            ["--fs-tracks" as string]: tracksCss(tracks),
            ...(vertical
              ? {
                  gridTemplateRows: tracks.map((t) => `minmax(min-content, ${t}fr)`).join(" "),
                }
              : {}),
          }}
        >
          {container.columns.map((_, i) => (
            <div key={i} className="relative min-h-0 min-w-0">
              {children(i)}
            </div>
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
