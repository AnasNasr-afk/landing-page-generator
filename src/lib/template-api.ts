import type { Container, Template, TemplateKind } from "./builder-types";
import { PUBLISH_API } from "./publish/config";

/**
 * The saved-template library, stored in the backend.
 *
 * Templates hold the builder's own `Container[]` tree rather than the HTML a
 * publish produces: a template exists to be reopened and edited, so it has to
 * keep the source, not the output. `src/lib/publish` is the other direction.
 *
 * The seeded templates in `builder-content.ts` stay local and are marked
 * `system` — they ship with the builder and are not stored here.
 */

/** What the API returns. `_id` is dropped server-side in favour of `id`. */
type ApiTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  kind: TemplateKind;
  containers: Container[];
};

export type NewTemplate = {
  name: string;
  description: string;
  category: string;
  kind: TemplateKind;
  containers: Container[];
};

const TEMPLATES_URL = `${PUBLISH_API}/api/templates`;

/** Turns a failed response into an Error carrying the server's own message. */
async function fail(res: Response): Promise<never> {
  let message = `${res.status} ${res.statusText}`;
  try {
    const body = (await res.json()) as { error?: string; details?: string[] };
    if (body.error)
      message = body.details?.length ? `${body.error}: ${body.details[0]}` : body.error;
  } catch {
    // Not JSON; the status line is the best description available.
  }
  throw new Error(message);
}

/** Saved templates, newest first. System templates are not included. */
export async function fetchTemplates(): Promise<Template[]> {
  const res = await fetch(TEMPLATES_URL);
  if (!res.ok) return fail(res);

  const list = (await res.json()) as ApiTemplate[];
  return list.map((t) => ({ ...t, system: false }));
}

export async function createTemplate(input: NewTemplate): Promise<Template> {
  const res = await fetch(TEMPLATES_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) return fail(res);

  return { ...((await res.json()) as ApiTemplate), system: false };
}

export async function deleteTemplate(id: string): Promise<void> {
  const res = await fetch(`${TEMPLATES_URL}/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) return fail(res);
}
