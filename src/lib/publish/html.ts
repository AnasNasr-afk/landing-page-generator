/** Small string helpers shared by the serializer. */

/**
 * Escapes a value for use as HTML text or inside a double/single-quoted
 * attribute. Marketing copy routinely contains `&` ("Cars & Trucks") and
 * quotes, so every interpolated value goes through this.
 */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Same as `esc`, but keeps author line breaks visible in the published page. */
export function escLines(value: unknown): string {
  return esc(value).replace(/\r?\n/g, "<br>");
}

type AttrValue = string | number | boolean | undefined;

/**
 * Builds an attribute string, dropping empty values and rendering `true` as a
 * bare attribute (`required`, `hidden`, `open`).
 */
export function attrs(map: Record<string, AttrValue>): string {
  return Object.entries(map)
    .filter(([, v]) => v !== undefined && v !== false && v !== "")
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`))
    .join("");
}

/** Turns a label into a form field name: "Full name" -> "full_name". */
export function fieldName(label: string, fallback: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || fallback;
}

/** Joins class names, skipping blanks. */
export function cls(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
