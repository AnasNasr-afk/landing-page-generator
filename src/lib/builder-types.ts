export type Lang = "en" | "ar";

export type LText = { en: string; ar: string };

export const t = (v: LText | undefined, lang: Lang) =>
  (v ? v[lang] || v.en : "") as string;

export type Align = "start" | "center" | "end";

export type CtaAction =
  | "internal"
  | "external"
  | "scroll"
  | "app"
  | "search";

export type Cta = {
  label: LText;
  action: CtaAction;
  destination: string;
  event: string;
  variant: "primary" | "secondary" | "inverse" | "custom";
  /** Button colour, used only by the `custom` variant. */
  color?: string | undefined;
  /** Label colour for `custom`; `auto` derives it from `color`'s brightness. */
  textTone?: "auto" | "light" | "dark" | "custom" | undefined;
  /** Exact label colour, used only when `textTone` is `custom`. */
  textColor?: string | undefined;
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

/**
 * A background beyond the four brand presets.
 *
 * Kept as a separate optional field rather than folded into `background` so
 * that every page and template saved before this existed still loads: when
 * `bg` is absent the preset is used exactly as before.
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

/**
 * How a saved template is reused.
 *
 * `page` replaces the canvas and starts a new landing page; `block` is a
 * single container inserted into the page already open. The distinction is
 * what the marketing team actually does day to day — one hero or one lead
 * form gets reused far more often than a whole page.
 */
export type TemplateKind = "page" | "block";

export type Template = {
  id: string;
  name: string;
  description: string;
  category: string;
  kind: TemplateKind;
  containers: Container[];
  /** Shipped with the builder, so it cannot be deleted from the library. */
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

export const uid = () => Math.random().toString(36).slice(2, 10);

export const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const reId = (containers: Container[]): Container[] =>
  clone(containers).map((c) => ({
    ...c,
    id: uid(),
    columns: c.columns.map((col) => col.map((el) => ({ ...el, id: uid() }))),
  }));
