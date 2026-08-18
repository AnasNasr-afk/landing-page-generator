import { type Lang, type LandingPage, t } from "@/lib/builder-types";
import { FONT_BASE, FORM_ACTION, PUBLISH_API, assetOrigin } from "./config";
import { esc } from "./html";
import { serializePage } from "./serialize";
import { PUBLISH_CSS, fontFaceCss } from "./styles";

/**
 * The publish payload — what gets stored, and what the website fetches.
 *
 * `html` is the page. Everything around it exists because HTML alone cannot
 * carry it: two languages, the SEO fields (the host site owns `<head>` and sets
 * them itself through NextSeo), and the stylesheet.
 *
 * Deliberately the same shape the scaffolding project already consumes for blog
 * articles — an HTML string plus metadata alongside it — so integration is a
 * pattern their codebase has shipped before, not a new one.
 */

export type PublishedSeo = {
  title: string;
  description: string;
  canonical: string;
  index: boolean;
  targetQuery: string;
  aiAnswer: string;
};

export type PublishedLocale = {
  html: string;
  seo: PublishedSeo;
};

export type PublishPayload = {
  slug: string;
  name: string;
  status: "published";
  /** One stylesheet shared by every locale. */
  css: string;
  locales: Partial<Record<Lang, PublishedLocale>>;
};

/** Renders the page once per configured language and packages the result. */
export function buildPayload(page: LandingPage): PublishPayload {
  const origin = assetOrigin();
  const languages: Lang[] = page.languages.length > 0 ? page.languages : ["en"];
  const locales: Partial<Record<Lang, PublishedLocale>> = {};

  for (const lang of languages) {
    locales[lang] = {
      html: serializePage(page.containers, {
        lang,
        assetOrigin: origin,
        formAction: FORM_ACTION,
      }),
      seo: {
        title: t(page.seo.title, lang),
        description: t(page.seo.description, lang),
        canonical: page.seo.canonical,
        index: page.seo.index,
        targetQuery: t(page.seo.targetQuery, lang),
        aiAnswer: t(page.seo.aiAnswer, lang),
      },
    };
  }

  return {
    slug: page.seo.slug || page.slug,
    name: page.name,
    status: "published",
    css: fontFaceCss(FONT_BASE) + PUBLISH_CSS,
    locales,
  };
}

/** POSTs the payload to the publish API. Throws with the server's reply on failure. */
export async function publishPage(page: LandingPage): Promise<PublishPayload> {
  const payload = buildPayload(page);
  const res = await fetch(`${PUBLISH_API}/api/pages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} — ${await res.text()}`);
  }
  return payload;
}

/** Public URL of a published page on the mock backend. */
export function publishedUrl(slug: string, lang: Lang): string {
  return `${PUBLISH_API}/p/${encodeURIComponent(slug)}?lang=${lang}`;
}

/**
 * Wraps a locale's fragment in a complete HTML document.
 *
 * Only for the "Download .html" button and standalone inspection — the real
 * integration sends the fragment and lets the host build `<head>`. Mirrors what
 * the mock backend's `GET /p/:slug` serves so both previews agree.
 */
export function standaloneDocument(payload: PublishPayload, lang: Lang): string {
  const locale = payload.locales[lang];
  if (!locale) return "";
  const { seo, html } = locale;

  const head = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${esc(seo.title || payload.name)}</title>`,
    seo.description ? `<meta name="description" content="${esc(seo.description)}">` : "",
    seo.canonical ? `<link rel="canonical" href="${esc(seo.canonical)}">` : "",
    seo.index ? "" : `<meta name="robots" content="noindex">`,
    `<style>${payload.css}</style>`,
  ]
    .filter(Boolean)
    .join("\n    ");

  return `<!doctype html>
<html lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}">
  <head>
    ${head}
  </head>
  <body style="margin:0">
    ${html}
  </body>
</html>
`;
}
