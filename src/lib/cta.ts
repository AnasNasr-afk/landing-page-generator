import type { Cta, CtaAction } from "./builder-types";
import type { FsIconName } from "./fs-icons";

/**
 * CTA behaviour derived from what an editor actually typed.
 *
 * The panel used to ask editors to classify their own URL — internal vs
 * external vs deep link vs search — which is a developer's distinction, decided
 * nothing they could see, and could contradict the destination beside it (an
 * `https://` link filed as "internal" opened in the same tab). A link's kind is
 * legible from the link itself, so it is read rather than asked for.
 *
 * The stored `action` is still written on publish as `data-fs-action` for the
 * host's analytics, and old CTAs keep whatever they were saved with when the
 * destination is empty.
 */
export function ctaAction(destination: string, saved?: CtaAction): CtaAction {
  const dest = destination.trim();
  if (!dest) return saved ?? "internal";
  if (dest.startsWith("#")) return "scroll";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(dest)) {
    // A q84sale:// style scheme is the app; anything else is the open web.
    return /^https?:\/\//i.test(dest) ? "external" : "app";
  }
  if (dest.includes("/search") || dest.includes("?")) return "search";
  return "internal";
}

/**
 * Corner radius of a button, in px.
 *
 * A landing page sets its own tone — some want the squared-off buttons the
 * marketplace uses, some want fully rounded pills — so this is a per-CTA value
 * rather than one global. 12px is what the button had before it was adjustable,
 * and a missing value reads as that so nothing on a saved page moves. 24 is a
 * full pill at the button's height; beyond that adds nothing.
 */
export const CTA_RADIUS_MAX = 24;

export const ctaRadius = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= CTA_RADIUS_MAX ? n : 12;
};

/**
 * What each action used to draw, before the symbol became a stored field.
 *
 * Only consulted for CTAs saved without one, so those buttons keep the symbol
 * they were published with instead of silently losing it.
 */
const LEGACY_ACTION_ICON: Record<CtaAction, FsIconName> = {
  internal: "arrowRight",
  external: "externalLink",
  scroll: "arrowDown",
  app: "phoneDevice",
  search: "search",
};

/** The symbol to draw, or `null` for a text-only button. */
export function ctaIcon(cta: Cta): string | null {
  if (cta.icon === "none") return null;
  if (cta.icon) return cta.icon;
  return LEGACY_ACTION_ICON[cta.action] ?? "arrowRight";
}
