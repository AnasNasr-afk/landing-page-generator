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

export const TONE_COLOR = { light: "#ffffff", dark: "#020618" } as const;

/** WCAG relative luminance, used to pick readable text over a custom colour. */
export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 1;
  let h = m[1] as string;
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const channel = (i: number) => {
    const v = parseInt(h.slice(i * 2, i * 2 + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

export function resolveTone(c: Container): "light" | "dark" {
  if (c.textTone && c.textTone !== "auto") return c.textTone;
  if (!c.bg) return PRESET_TONE[c.background];
  if (c.bg.type === "color") return luminance(c.bg.color) < 0.45 ? "light" : "dark";
  // Photographs vary too much to sample meaningfully, and the overlay darkens
  // them, so light text is the safer default. Editors can override.
  return "light";
}

/** True when the preset classes should be skipped in favour of a custom background. */
export const hasCustomBg = (c: Container) => !!c.bg;

/** Background declarations for the container's own element. */
export function backgroundStyle(c: Container): CSSProperties {
  const bg = c.bg;
  if (!bg) return {};
  if (bg.type === "color") return { backgroundColor: bg.color };
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
