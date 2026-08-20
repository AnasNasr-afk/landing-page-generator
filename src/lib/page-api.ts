import type { Lang, LandingPage } from "./builder-types";
import { PUBLISH_API } from "./publish/config";

export type PageSummary = {
  slug: string;
  name: string;
  status: "draft" | "published";
  publishedAt: string;
  locales: Lang[];
  editable: boolean;
};

async function fail(res: Response): Promise<never> {
  let message = `${res.status} ${res.statusText}`;
  try {
    const body = (await res.json()) as { error?: string; details?: string[] };
    if (body.error)
      message = body.details?.length ? `${body.error}: ${body.details[0]}` : body.error;
  } catch {
    // The status line is the best description for a non-JSON response.
  }
  throw new Error(message);
}

export async function fetchPages(): Promise<PageSummary[]> {
  const res = await fetch(`${PUBLISH_API}/api/pages`);
  if (!res.ok) return fail(res);
  return (await res.json()) as PageSummary[];
}

/** Loads the builder source saved alongside a published rendering. */
export async function fetchPageForEditing(slug: string): Promise<LandingPage> {
  const res = await fetch(`${PUBLISH_API}/api/pages/${encodeURIComponent(slug)}/editor`);
  if (!res.ok) return fail(res);

  const page = (await res.json()) as { source?: LandingPage };
  if (!page.source) {
    throw new Error("This page was published before editable source was saved.");
  }
  return page.source;
}

export async function deletePage(slug: string): Promise<void> {
  const res = await fetch(`${PUBLISH_API}/api/pages/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
  if (!res.ok) return fail(res);
}
