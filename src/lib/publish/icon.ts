import { FS_ICONS } from "@/lib/fs-icons";
import { resolveIconName } from "@/lib/icon-name";

const cache = new Map<string, string>();

/**
 * Renders one of 4Sale's icons to a standalone SVG string.
 *
 * A published page has no React, no icon font and no external requests, so
 * icons have to be inlined. That used to mean rendering `lucide-react` through
 * `renderToStaticMarkup`; now the icons are 4Sale's own and already stored as
 * path data, so the string is assembled directly — no React on the publish path
 * and no icon library in the bundle.
 *
 * `name` comes from page data and may be anything an editor typed, or a Lucide
 * name left behind by a page saved before the switch. `resolveIconName` handles
 * both and always returns a real glyph, so a published page can never ship an
 * empty icon slot.
 *
 * Single-colour icons paint with `currentColor`, so the stylesheet keeps
 * control; the gold `featured` crown carries its own fills.
 */
export function iconSvg(name: string, className = "fs-lp-ic", style = ""): string {
  const key = `${name}|${className}|${style}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const icon = FS_ICONS[resolveIconName(name)];
  const paths = icon.paths
    .map((p) => `<path d="${p.d}" fill="${"fill" in p ? p.fill : "currentColor"}"/>`)
    .join("");
  const svg =
    `<svg class="${className}"${style ? ` style="${style}"` : ""} viewBox="${icon.viewBox}" ` +
    `aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;

  cache.set(key, svg);
  return svg;
}
