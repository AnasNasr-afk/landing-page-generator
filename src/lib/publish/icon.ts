import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as Icons from "lucide-react";

type IconComponent = ComponentType<{ className?: string }>;

const cache = new Map<string, string>();

/**
 * Renders a Lucide icon to a standalone SVG string.
 *
 * The published page has no React, no icon font and no external requests, so
 * icons must be inlined as SVG. Going through the same lucide-react components
 * the canvas uses guarantees the published page matches the preview, and covers
 * any icon name a user types into the properties panel — the icon fields are
 * free text, not a fixed picker.
 *
 * Lucide emits `stroke="currentColor"`, so colour is controlled by CSS.
 */
export function iconSvg(name: string, className = "fs-lp-ic"): string {
  const key = `${name}|${className}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const registry = Icons as unknown as Record<string, IconComponent | undefined>;
  const Component = registry[name] ?? registry["Circle"];
  if (!Component) return "";

  const svg = renderToStaticMarkup(createElement(Component, { className }));
  cache.set(key, svg);
  return svg;
}
