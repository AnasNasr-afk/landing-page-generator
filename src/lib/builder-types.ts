export type Lang = "en" | "ar";

export type LText = { en: string; ar: string };

export const t = (v: LText | undefined, lang: Lang) => (v ? v[lang] || v.en : "") as string;

export type Align = "start" | "center" | "end";

/**
 * Body-copy weight. Only the two SS Sakr Soft cuts 4Sale actually uses for
 * running text — Regular (400) and Bold (700). The family has no italic, so
 * that is not offered; a browser-slanted fake would not look like 4Sale.
 */
export type TextWeight = "regular" | "bold";

export const textWeight = (v: unknown): TextWeight => (v === "bold" ? "bold" : "regular");

/**
 * How an icon row arranges its pairs.
 *
 * `row` wraps them inline — the original behaviour, and what blocks saved
 * before this existed get. `list` stacks one per line, which is the shape a
 * feature tick-list needs; q84sale.com's business-profile page uses exactly
 * that for its eight-point "what you get" list.
 */
export type IconsLayout = "row" | "list";

export const iconsLayout = (v: unknown): IconsLayout => (v === "list" ? "list" : "row");

/** Icon edge length in px. Clamped to the range the panel's slider offers. */
export const iconsSize = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 14 && n <= 40 ? n : 16;
};

/**
 * How an icon is painted.
 *
 * The three treatments mirror how 4Sale's design system pairs its ramps, so a
 * chip built here matches a toned or filled control on q84sale.com:
 *
 * - `plain` — the glyph alone in the tone's 500. No chip.
 * - `soft`  — the 600 glyph on the 50 tint, the pairing their toned buttons use
 *             (Call is `prim_600` on `prim_4sale_50`).
 * - `solid` — a white glyph on the 500, the filled pairing.
 */
export type IconStyle = "plain" | "soft" | "solid";

/**
 * `fallback` is per-block, because the blocks looked different before this was
 * configurable: an icon row drew a bare glyph, a card drew a tinted chip.
 * Reading a missing value as that block's own previous look is what keeps saved
 * pages rendering the way they were saved.
 */
export const iconStyle = (v: unknown, fallback: IconStyle = "plain"): IconStyle =>
  v === "plain" || v === "soft" || v === "solid" ? v : fallback;

/** The accent ramps an icon may be tinted from. Palette only — no free colour. */
export type IconTone = "brand" | "success" | "warning" | "error" | "energy" | "purple" | "neutral";

/** Every tone, in the order the panel shows its swatches. */
export const ICON_TONES: IconTone[] = [
  "brand",
  "success",
  "warning",
  "error",
  "energy",
  "purple",
  "neutral",
];

export const iconTone = (v: unknown): IconTone =>
  ICON_TONES.includes(v as IconTone) ? (v as IconTone) : "brand";

/**
 * Tailwind classes per tone and treatment.
 *
 * `brand` maps onto the `fs-prim-*` ramp rather than a `fs-brand-*` one, which
 * does not exist — the brand blue is the primary ramp.
 */
export const ICON_TONE_CLASS: Record<IconTone, { plain: string; soft: string; solid: string }> = {
  brand: {
    plain: "text-fs-prim-500",
    soft: "bg-fs-prim-50 text-fs-prim-600",
    solid: "bg-fs-prim-500 text-white",
  },
  success: {
    plain: "text-fs-success-500",
    soft: "bg-fs-success-50 text-fs-success-600",
    solid: "bg-fs-success-500 text-white",
  },
  warning: {
    plain: "text-fs-warning-500",
    soft: "bg-fs-warning-50 text-fs-warning-600",
    solid: "bg-fs-warning-500 text-white",
  },
  error: {
    plain: "text-fs-error-500",
    soft: "bg-fs-error-50 text-fs-error-600",
    solid: "bg-fs-error-500 text-white",
  },
  energy: {
    plain: "text-fs-energy-500",
    soft: "bg-fs-energy-50 text-fs-energy-600",
    solid: "bg-fs-energy-500 text-white",
  },
  purple: {
    plain: "text-fs-purple-500",
    soft: "bg-fs-purple-50 text-fs-purple-600",
    solid: "bg-fs-purple-500 text-white",
  },
  neutral: {
    plain: "text-fs-neutral-600",
    soft: "bg-fs-neutral-50 text-fs-neutral-900",
    solid: "bg-fs-neutral-900 text-white",
  },
};

/** The same pairings as literal hex, for the published stylesheet. */
export const ICON_TONE_HEX: Record<IconTone, { fg: string; soft: string; base: string }> = {
  brand: { fg: "#1d4aff", soft: "#f2f5ff", base: "#1a43e8" },
  success: { fg: "#1db75a", soft: "#e6f8ee", base: "#179449" },
  warning: { fg: "#ffba00", soft: "#fff8e6", base: "#c48f00" },
  error: { fg: "#e63d4e", soft: "#fdeced", base: "#c43543" },
  energy: { fg: "#ff682c", soft: "#fff0ea", base: "#de5b26" },
  purple: { fg: "#7b60ff", soft: "#f2efff", base: "#7057e8" },
  neutral: { fg: "#5c6499", soft: "#f5f6f9", base: "#0a1243" },
};

export type CtaAction = "internal" | "external" | "scroll" | "app" | "search";

export type Cta = {
  label: LText;
  /**
   * Where the button goes. Derived from `destination` rather than chosen, so
   * there is no way for the two to disagree — see `ctaAction` in
   * `src/lib/cta.ts`. Still stored because published pages carry it as
   * `data-fs-action` for the host's analytics.
   */
  action: CtaAction;
  destination: string;
  event: string;
  /**
   * The symbol beside the label, or `"none"` for a text-only button.
   *
   * Explicit rather than implied by `action`: in q84sale.com's own code the
   * symbol is chosen per button, and **238 of its 333 buttons carry none at
   * all**, so text-only is the norm and has to be expressible. Older CTAs have
   * no `icon` and fall back to the symbol their action used to imply, so they
   * keep the button they were saved with.
   */
  icon?: string | undefined;
  /**
   * Corner radius in px, 0 (square) to 24 (a full pill at button height).
   *
   * Shape is left open where colour is not: a rounder or squarer button still
   * reads as 4Sale, whereas an off-palette one does not. Absent on older CTAs
   * and read as the 12px they were drawn with — see `ctaRadius`.
   */
  radius?: number | undefined;
  /**
   * Buttons are painted from the 4Sale palette only — there is deliberately no
   * per-CTA colour. Pages built here are embedded in q84sale.com, so a button
   * that can be any hex is a button that can stop looking like 4Sale.
   *
   * Pages saved before this carry `variant: "custom"` plus loose hex fields;
   * `ctaVariant` maps them back onto `primary` on read, so they still render.
   */
  variant: "primary" | "secondary" | "inverse";
};

export type FormField = {
  id: string;
  label: LText;
  type: "text" | "phone" | "email" | "dropdown" | "checkbox";
  required: boolean;
  options?: string;
};

export type ElementType =
  | "heading"
  | "text"
  | "image"
  | "video"
  | "cards"
  | "icons"
  | "cta"
  | "ctaSection"
  | "form"
  | "listings"
  | "faq"
  | "steps"
  | "divider"
  | "spacer";

export type ElementProps = Record<string, unknown>;

export type PageElement = {
  id: string;
  type: ElementType;
  props: ElementProps;
};

export type ContainerLayout = "1" | "50-50" | "35-65" | "65-35" | "3";

export type ContainerDirection = "horizontal" | "vertical";

/** Pages saved before direction existed are horizontal. */
export const containerDirection = (v: unknown): ContainerDirection =>
  v === "vertical" ? "vertical" : "horizontal";

/**
 * A background beyond the four 4Sale presets.
 *
 * Only images are offered in the editor. `{ type: "color" }` is still accepted
 * so pages saved with a free hex still load; those hexes are ignored at render
 * time and the preset on `background` is used instead.
 */
export type ContainerBg =
  | { type: "color"; color: string }
  | {
      type: "image";
      src: string;
      size: "cover" | "contain";
      position: "top" | "center" | "bottom";
      /** Percentage of black laid over the image so text stays readable. 0–80. */
      overlay: number;
    };

export type Container = {
  id: string;
  name: string;
  layout: ContainerLayout;
  /**
   * How the slots are arranged. Horizontal is side-by-side columns (the original
   * behaviour). Vertical is the same split stacked as rows.
   */
  direction?: ContainerDirection | undefined;
  background: "white" | "soft" | "brand" | "gray";
  /** Overrides `background` when present; cleared by setting it back to undefined. */
  bg?: ContainerBg | undefined;
  /** `auto` derives readable text from the background's brightness. */
  textTone?: "auto" | "light" | "dark";
  paddingY: number;
  gap: number;
  radius: number;
  contentWidth: "narrow" | "default" | "wide" | "full";
  align: Align;
  /**
   * Relative sizes of each slot, same length as the column count. Horizontal is
   * width; vertical is height. Omitted on older pages — derived from `layout`.
   */
  tracks?: number[] | undefined;
  /** Extra minimum height for the section, in pixels. 0 / omitted = hug content. */
  minHeight?: number | undefined;
  columns: PageElement[][];
};

export type SeoSettings = {
  title: LText;
  description: LText;
  slug: string;
  targetQuery: LText;
  index: boolean;
  canonical: string;
  aiAnswer: LText;
};

export type LandingPage = {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "published";
  languages: Lang[];
  seo: SeoSettings;
  containers: Container[];
};

export type Template = {
  id: string;
  name: string;
  description: string;
  category: string;
  containers: Container[];
  system?: boolean;
};

export const COLUMN_COUNT: Record<ContainerLayout, number> = {
  "1": 1,
  "50-50": 2,
  "35-65": 2,
  "65-35": 2,
  "3": 3,
};

export const LAYOUT_LABEL: Record<ContainerLayout, string> = {
  "1": "1 column",
  "50-50": "2 columns — 50/50",
  "35-65": "2 columns — 35/65",
  "65-35": "2 columns — 65/35",
  "3": "3 columns",
};

export const LAYOUT_LABEL_VERTICAL: Record<ContainerLayout, string> = {
  "1": "1 row",
  "50-50": "2 rows — 50/50",
  "35-65": "2 rows — 35/65",
  "65-35": "2 rows — 65/35",
  "3": "3 rows",
};

/** Relative sizes used by the picker icons and vertical row tracks. */
export const LAYOUT_SPLIT: Record<ContainerLayout, number[]> = {
  "1": [1],
  "50-50": [50, 50],
  "35-65": [35, 65],
  "65-35": [65, 35],
  "3": [1, 1, 1],
};

export const layoutLabel = (layout: ContainerLayout, direction?: unknown) =>
  containerDirection(direction) === "vertical"
    ? LAYOUT_LABEL_VERTICAL[layout]
    : LAYOUT_LABEL[layout];

const TRACK_MIN = 12;

export function defaultTracks(layout: ContainerLayout): number[] {
  const split = LAYOUT_SPLIT[layout];
  const sum = split.reduce((a, b) => a + b, 0) || 1;
  return split.map((n) => (n / sum) * 100);
}

export function containerTracks(c: Pick<Container, "layout" | "tracks">): number[] {
  const n = COLUMN_COUNT[c.layout];
  if (Array.isArray(c.tracks) && c.tracks.length === n) return c.tracks;
  return defaultTracks(c.layout);
}

export function tracksCss(tracks: number[]): string {
  return tracks.map((t) => `${t}fr`).join(" ");
}

/** `divider` is the slot on the start side of the dragged edge. */
export function nudgeTracks(tracks: number[], divider: number, deltaFrac: number): number[] {
  const next = tracks.slice();
  const j = divider + 1;
  if (j >= next.length) return next;
  const delta = deltaFrac * 100;
  let a = (next[divider] ?? 0) + delta;
  let b = (next[j] ?? 0) - delta;
  if (a < TRACK_MIN) {
    b -= TRACK_MIN - a;
    a = TRACK_MIN;
  }
  if (b < TRACK_MIN) {
    a -= TRACK_MIN - b;
    b = TRACK_MIN;
  }
  next[divider] = a;
  next[j] = b;
  return next;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const reId = (containers: Container[]): Container[] =>
  clone(containers).map((c) => ({
    ...c,
    id: uid(),
    columns: c.columns.map((col) => col.map((el) => ({ ...el, id: uid() }))),
  }));
