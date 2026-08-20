/**
 * Publish-time configuration.
 *
 * Prototype defaults point at the local mock backend (`mock-backend/server.js`).
 * When the real headless CMS takes over, only PUBLISH_API changes — the request
 * and payload shapes stay the same.
 */

export const PUBLISH_API = "http://localhost:4000";

/**
 * POST target baked into exported lead forms. The published HTML carries no
 * JavaScript, so the form has to be a plain HTML POST to something real.
 */
export const FORM_ACTION = "/api/landing-page-lead";

/**
 * Absolute origin used to rewrite bundled asset URLs.
 *
 * Vite resolves `@/assets/*` imports to paths that only exist while THIS app is
 * being served ("/src/assets/hero.jpg" in dev, "/assets/hero-a1b2c3.jpg" in a
 * build). Exported HTML is displayed on another origin entirely, so relative
 * paths must become absolute before publishing.
 */
export function assetOrigin(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}

/**
 * Where the published fragment looks for the brand typeface.
 *
 * q84sale.com already serves SS Sakr Soft, but registers it through next/font
 * under a build-hashed family name (`__appFont_a40bca`) that changes on every
 * deploy, and its `<body>` computes to Times — so the fragment can neither name
 * the host's family nor safely inherit. It declares the font itself instead.
 *
 * This is deliberately a ROOT-RELATIVE path, not an absolute URL: it resolves
 * against whatever domain the page is served from, which keeps the request
 * same-origin. Pointing it at this app's origin instead would make it a
 * cross-origin font request and browsers would block it without CORS headers.
 *
 * Requires the 4Sale site to serve the woff2 files at this path. Until it does,
 * the font simply fails to load and the stack falls back to system-ui — the
 * page still renders, it just isn't branded.
 */
export const FONT_BASE = "/fonts";

/** Resolves an element's `src` to an absolute URL, leaving real URLs untouched. */
export function resolveAssetUrl(src: string, origin: string): string {
  if (!src) return "";
  if (/^(https?:|data:|\/\/)/i.test(src)) return src;
  if (!origin) return src;
  return `${origin.replace(/\/$/, "")}/${src.replace(/^\//, "")}`;
}
