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

/** Resolves an element's `src` to an absolute URL, leaving real URLs untouched. */
export function resolveAssetUrl(src: string, origin: string): string {
  if (!src) return "";
  if (/^(https?:|data:|\/\/)/i.test(src)) return src;
  if (!origin) return src;
  return `${origin.replace(/\/$/, "")}/${src.replace(/^\//, "")}`;
}
