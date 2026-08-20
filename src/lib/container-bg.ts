import type { CSSProperties } from "react";
import type { Container } from "./builder-types";

/**
 * Resolves a container's background into styles.
 *
 * Shared by the canvas and the publish serializer so the editor and the
 * published page cannot disagree about what a background looks like. The canvas
 * consumes the `CSSProperties` directly; the serializer runs it through
 * `toCssText` for a style attribute.
 */

/** Which text colour each brand preset already implies. */
const PRESET_TONE: Record<Container["background"], "light" | "dark"> = {
  white: "dark",
  soft: "dark",
  gray: "dark",
  brand: "light",
};

/** 4Sale's two ink colours: `shades/0` and `neutral/900`. */
export const TONE_COLOR = { light: "#ffffff", dark: "#0a1243" } as const;

/**
 * The three palette button styles, and the only values a CTA may hold.
 *
 * Buttons are painted from the 4Sale palette only — a page built here is
 * embedded in q84sale.com, and a button that can be any hex is a button that
 * can stop looking like 4Sale. Pages saved while a free colour existed still
 * carry `variant: "custom"`, so anything unrecognised reads back as `primary`
 * rather than emitting a class the stylesheet no longer defines.
 */
export function ctaVariant(variant: unknown): "primary" | "secondary" | "inverse" {
  return variant === "secondary" || variant === "inverse" ? variant : "primary";
}

/**
 * Colour for a heading or paragraph, or `undefined` to inherit.
 *
 * Only the two palette tones are honoured. `auto` deliberately sets nothing:
 * the container already paints a colour that is readable against its own
 * background, so inheriting is both the safe default and the one that keeps
 * working when the background changes later. A legacy `custom` tone lands here
 * too and inherits — a readable outcome, rather than a stored hex that may no
 * longer suit the section around it.
 */
export function resolveTextColor(tone: unknown): string | undefined {
  return tone === "light" || tone === "dark" ? TONE_COLOR[tone] : undefined;
}

export function resolveTone(c: Container): "light" | "dark" {
  if (c.textTone && c.textTone !== "auto") return c.textTone;
  if (c.bg?.type === "image") {
    // Photographs vary too much to sample meaningfully, and the overlay darkens
    // them, so light text is the safer default. Editors can override.
    return "light";
  }
  return PRESET_TONE[c.background];
}

/**
 * True when the preset classes should be skipped in favour of a background image.
 *
 * A leftover `{ type: "color" }` from older pages is ignored: sections only
 * paint from the 4Sale presets (or an image), so a stored hex cannot leak
 * through as a one-off colour.
 */
export const hasCustomBg = (c: Container) => c.bg?.type === "image";

/** Background declarations for the container's own element. */
export function backgroundStyle(c: Container): CSSProperties {
  const bg = c.bg;
  if (!bg || bg.type !== "image") return {};
  return {
    backgroundImage: `url("${bg.src.replace(/"/g, '\\"')}")`,
    backgroundSize: bg.size,
    backgroundPosition: bg.position,
    backgroundRepeat: "no-repeat",
  };
}

/** The scrim laid over an image, or null when none is needed. */
export function overlayStyle(c: Container): CSSProperties | null {
  const bg = c.bg;
  if (!bg || bg.type !== "image" || !bg.overlay) return null;
  return {
    position: "absolute",
    inset: 0,
    backgroundColor: `rgba(0,0,0,${Math.min(80, Math.max(0, bg.overlay)) / 100})`,
    pointerEvents: "none",
  };
}

/** Serialises a style object to a CSS declaration string. */
export function toCssText(style: CSSProperties): string {
  return Object.entries(style)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => {
      const prop = k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      return `${prop}:${typeof v === "number" && v !== 0 ? `${v}px` : v}`;
    })
    .join(";");
}
