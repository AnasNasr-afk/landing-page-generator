import { type Lang, type LText, t } from "./builder-types";

/**
 * The 4Sale catalogue and listings API.
 *
 * Atlas endpoints:
 *
 * - `GET /admin/categories/verticals` — the top-level categories.
 * - `GET /admin/categories/{id}/children` — one level down. The editor drills
 *   (Automotive → Used Cars → BMW → 5 Series), and `has_children` says when to
 *   stop, so a leaf costs no request.
 * - `GET /search?q=&page=&limit=` — keyword search. **Keyword only.** Its
 *   `category_id` parameter triggers Atlas's V4 `advancedSearch` path, which
 *   502s / times out without a credential we do not send. `limit` caps at 50.
 * - `GET /categories/{id}/attributes` — the **full inherited** attribute schema.
 *   On the 5 Series leaf this returns all 43 Used Cars attributes, which is
 *   what lets a card's specification line be built from the listing's own
 *   `cat_id` with no walk up the tree.
 * - `GET /categories/{id}/attributes/with-parent` — despite the name, the
 *   **opposite**: only the attributes the leaf defines itself (the 5 Series
 *   returns exactly one, Model). `fetchFilters` uses this one and merges along
 *   the selected path to compensate, which is why it makes a request per level.
 *   It could likely be a single `/attributes` call instead — untested, so it is
 *   recorded here rather than changed.
 *
 * Everything the builder touches goes through the narrow `Category` / `Listing`
 * shapes below, read in `readCategory` / `readSearchListing` and nowhere else,
 * so a change to 4Sale's payloads is a change to two functions rather than to
 * the panel, the modal and the renderer.
 *
 * Live by default — the service is public and CORS-open, so no proxy and no key
 * are involved.
 */
const BASE = (
  (import.meta.env["VITE_LISTINGS_API"] as string | undefined) ??
  "https://services.q84sale.com/api/v1/atlas-service"
).replace(/\/$/, "");

/** True when a real service is configured; drives the panel's "mocked" hint. */
export const isLiveCatalogue = () => BASE !== "";

/** One node of the category tree. */
export type Category = {
  id: string;
  name: LText;
  /** Whether drilling in is possible — decides if another dropdown appears. */
  hasChildren: boolean;
  /** `display_order` from the service. Ties are common, so name breaks them. */
  order: number;
};

export type Listing = {
  id: string;
  title: LText;
  /** Formatted and currency-suffixed, e.g. "1,600 KWD" / "1,600 د.ك". */
  price: LText;
  area: LText;
  tag?: string | undefined;
  image?: string | undefined;
  url?: string | undefined;
  /** Leaf category id, in the same id space as the category tree. */
  catId?: string | undefined;
  /**
   * The grey line under the title — "2024, 80 K Km, Gray".
   *
   * Composed from `attrs` (attribute id → option id) resolved against the
   * category's attribute schema, which is where the labels live. Absent when
   * the schema request failed or the listing carries no recognised attributes,
   * and the card then closes the gap rather than reserving an empty row.
   */
  specs?: LText | undefined;
  /**
   * Relative age, e.g. "Since 3 Hour".
   *
   * Computed at read time from `date_sort` (the bump date the real site sorts
   * on, not `date_published`). A published page bakes this string in, so it
   * ages — see the note on `formatSince`.
   */
  since?: LText | undefined;
  /** Drives the Call and WhatsApp buttons. Digits only, no `+`. */
  phone?: string | undefined;
  /** `is_pm_enabled` — whether the seller accepts in-app chat. */
  chat?: boolean | undefined;
  /**
   * The photos the card's carousel pages through.
   *
   * Deliberately **not** driven by `images_count`. The real card paginates the
   * `thumbs` array — which the search endpoint caps at 2 — and appends one
   * "See more" slide, so a listing with 9 photos still shows 3 dots. Counting
   * `images_count` instead is what gave our cards 5 and 6 dots.
   */
  thumbs?: string[] | undefined;
  /** Seller avatar, shown as the circle at the photo's bottom-end corner. */
  vendorLogo?: string | undefined;
  /**
   * `is_verified` — a verified seller. Gates the avatar entirely: the real card
   * renders no avatar at all for an unverified seller, even when a logo exists.
   */
  verified?: boolean | undefined;
  /**
   * `is_prem` — a promoted listing, and the only thing that earns the gold
   * crown "Featured" pill. Not `plan_id`, which nearly every listing has.
   */
  featured?: boolean | undefined;
  /** `status === "pinned"` — its own tag, and it replaces the date with "Pinned today". */
  pinned?: boolean | undefined;
};

/** A selected branch, root first. The last entry is what gets queried. */
export type CategoryPath = { id: string; name: LText }[];

export type FilterOption = { id: string; label: LText };

type FilterBase = {
  id: string;
  label: LText;
  /** Secondary fields start collapsed behind "More filters". */
  primary: boolean;
  /** Atlas `sys_name`, used to lift Price out of the generic attribute list. */
  sysName: string;
};

/**
 * One filter control, described by the server rather than hardcoded here.
 *
 * Which filters exist depends entirely on the category — a car has a year and a
 * gearbox, a phone has storage and RAM — so the panel renders whatever
 * `fetchFilters` returns instead of switching on the category itself.
 */
export type FilterField =
  | (FilterBase & { kind: "multi"; options: FilterOption[] })
  | (FilterBase & { kind: "range"; min: number; max: number; step: number; unit: LText })
  | (FilterBase & { kind: "toggle" });

/** Either bound may be omitted — Atlas number attributes have no min/max. */
export type RangeValue = { min?: number | undefined; max?: number | undefined };

/** `string[]` for multi, `{min,max}` for range, `true` for an enabled toggle. */
export type FilterValue = string[] | RangeValue | boolean;

/** Applied filters, keyed by field id. Absent key means "not filtered on". */
export type FilterValues = Record<string, FilterValue>;

export const isRangeValue = (v: FilterValue | undefined): v is RangeValue =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const str = (v: unknown): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : "";

const num = (v: unknown, fallback: number): number => {
  const n = typeof v === "number" ? v : Number(str(v));
  return Number.isFinite(n) ? n : fallback;
};

/** Narrows anything to a plain object, so a missing branch reads as empty. */
const obj = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/**
 * Reads a bilingual name out of a payload.
 *
 * 4Sale's fields are inconsistent about this — some return `{ en, ar }`, some
 * return `name` plus `name_ar` — so both are accepted and a missing Arabic side
 * falls back to English rather than rendering empty in the AR view.
 */
function readLText(v: unknown, arSibling?: unknown): LText {
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const en = str(o["en"]);
    return { en, ar: str(o["ar"]) || en };
  }
  const en = str(v);
  return { en, ar: str(arSibling) || en };
}

function readCategory(v: unknown): Category {
  const o = (v ?? {}) as Record<string, unknown>;
  const children = o["children"];
  return {
    // Atlas ids are numbers; `str` normalises them, and the same id is what a
    // listing carries as `cat_id`, which is how the two endpoints join up.
    id: str(o["id"]) || str(o["slug"]),
    name: readLText(o["name_en"] ?? o["name"], o["name_ar"]),
    hasChildren:
      o["hasChildren"] === true ||
      o["has_children"] === true ||
      (Array.isArray(children) && children.length > 0),
    order: num(o["display_order"], 0),
  };
}

function readListing(v: unknown): Listing {
  const o = (v ?? {}) as Record<string, unknown>;
  const specs = o["specs"] ? readLText(o["specs"]) : undefined;
  const since = o["since"] ? readLText(o["since"]) : undefined;
  return {
    id: str(o["id"]),
    title: readLText(o["title"], o["title_ar"]),
    price: readLText(o["price"]),
    area: readLText(o["area"], o["area_ar"]),
    tag: str(o["tag"]) || undefined,
    image: str(o["image"]) || undefined,
    url: str(o["url"]) || undefined,
    // Every card field is persisted onto the element and re-read here, so the
    // canvas and the published page render from one cached search rather than
    // each re-querying and possibly disagreeing.
    specs: specs && (specs.en || specs.ar) ? specs : undefined,
    since: since && (since.en || since.ar) ? since : undefined,
    phone: str(o["phone"]) || undefined,
    chat: o["chat"] === true || undefined,
    thumbs: Array.isArray(o["thumbs"]) ? o["thumbs"].map(str).filter(Boolean) : undefined,
    vendorLogo: str(o["vendorLogo"]) || undefined,
    verified: o["verified"] === true || undefined,
    featured: o["featured"] === true || undefined,
    pinned: o["pinned"] === true || undefined,
  };
}

/** Turns a failed response into an Error carrying the server's own message. */
async function fail(res: Response): Promise<never> {
  let message = `${res.status} ${res.statusText}`;
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) message = body.error;
  } catch {
    // Not JSON; the status line is the best description available.
  }
  throw new Error(message);
}

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) return fail(res);
  return res.json();
}

/** Unwraps `{ data: [...] }` / `{ results: [...] }` envelopes as well as bare arrays. */
function readArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  const o = (v ?? {}) as Record<string, unknown>;
  for (const key of ["data", "results", "items", "categories", "listings"]) {
    const inner = o[key];
    if (Array.isArray(inner)) return inner;
  }
  return [];
}

/**
 * Children of `parentId`, or the top-level categories when it is omitted.
 *
 * Returning `[]` rather than throwing for a leaf keeps the panel's cascade
 * logic in one place: it renders a dropdown for every level that came back
 * non-empty and stops.
 */
export async function fetchCategories(parentId?: string): Promise<Category[]> {
  // The top level is a separate route rather than "children of nothing".
  const path = parentId
    ? `/admin/categories/${encodeURIComponent(parentId)}/children`
    : `/admin/categories/verticals`;

  return (
    readArray(await getJson(path))
      .map(readCategory)
      .filter((c) => c.id !== "")
      // `display_order` ties are common — Camping and Sports are both 60, Jobs and
      // Education both 110 — so the name settles it and the order stays stable.
      .sort((a, b) => a.order - b.order || a.name.en.localeCompare(b.name.en))
  );
}

/** How many extra dropdowns stay open before "More filters". */
const PRIMARY_DROPDOWNS = 4;

/**
 * The filters available for a category.
 *
 * Facets are a property of the category, not of the site: mobiles are filtered
 * by storage, cars by year and body type. `with-parent` also returns attributes
 * inherited from ancestors, so a leaf like iPhone still gets Condition.
 *
 * Search still takes only a keyword, so these ids are saved for publish rather
 * than sent with `/search`. A model leaf is often empty — iPhone 17 has no
 * attributes of its own — so every id on the selected path is fetched and
 * merged (Mobile Phones `99` supplies Storage, RAM, Condition).
 */
export async function fetchFilters(path: CategoryPath): Promise<FilterField[]> {
  if (path.length === 0) return [];

  const payloads = await Promise.all(
    path.map((node) =>
      getJson(`/categories/${encodeURIComponent(node.id)}/attributes/with-parent`).catch(() => ({
        data: { attributes: [] },
      })),
    ),
  );

  // Root first, leaf last: a more specific node overwrites the same attr_id,
  // while parent-only fields such as Condition on `99` are kept.
  const merged = new Map<string, unknown>();
  for (const json of payloads) {
    for (const raw of readAttributes(json)) {
      const id = str(obj(raw)["attr_id"]);
      if (id) merged.set(id, raw);
    }
  }

  const ranked = [...merged.values()]
    .flatMap((raw) => {
      const o = obj(raw);
      const field = readAttribute(raw);
      return field
        ? [{ field, order: num(o["display_order"], 0), pin: isPrimaryAttribute(o) }]
        : [];
    })
    .sort((a, b) => a.order - b.order);

  let dropdowns = 0;
  return ranked.map(({ field, pin }) => {
    if (pin) return { ...field, primary: true };
    if (field.kind === "multi" && dropdowns < PRIMARY_DROPDOWNS) {
      dropdowns += 1;
      return { ...field, primary: true };
    }
    return field;
  });
}

/**
 * Price, mileage and year are the filters people actually reach for, even when
 * Atlas marks Price `show_in_plf: false` (it is a listing field, not a
 * category-form field). Required dropdowns such as year get the same treatment.
 */
function isPrimaryAttribute(o: Record<string, unknown>): boolean {
  const sys = str(o["sys_name"]).toLowerCase();
  if (sys === "price" || sys.includes("mileage") || sys === "year") return true;
  return o["required"] === true && str(o["type"]) === "drop_down";
}

/** Atlas nests the list under `data.attributes`, not a bare `data` array. */
function readAttributes(json: unknown): unknown[] {
  const root = obj(json);
  const data = obj(root["data"]);
  const attrs = data["attributes"] ?? root["attributes"];
  return Array.isArray(attrs) ? attrs : [];
}

/**
 * One Atlas attribute mapped onto a filter control.
 *
 * `show_in_plf` is ignored: Price and several other listing filters are flagged
 * false because they live on the listing itself, not the category form. Every
 * renderable type becomes a control — `drop_down` a checkbox list, `bool` a
 * toggle, `number` an open From/To pair (the payload has no min/max). `file` is
 * an upload, not a facet, so it is skipped.
 */
function readAttribute(v: unknown): FilterField | null {
  const o = obj(v);
  const id = str(o["attr_id"]);
  if (!id) return null;

  const sys = str(o["sys_name"]);
  const en = str(o["label_en"]) || sys || id;
  const base: FilterBase = {
    id,
    label: { en, ar: str(o["label_ar"]) || en },
    primary: false,
    sysName: sys,
  };

  const type = str(o["type"]);
  if (type === "file") return null;
  if (type === "bool") return { ...base, kind: "toggle" };
  if (type === "number") {
    return { ...base, kind: "range", min: 0, max: 0, step: 1, unit: unitFor(sys) };
  }
  if (type !== "drop_down") return null;

  const options = (Array.isArray(o["options"]) ? o["options"] : []).flatMap((raw) => {
    const opt = obj(raw);
    const optId = str(opt["id"]);
    if (!optId) return [];
    const optEn = str(opt["label_en"]) || optId;
    return [{ id: optId, label: { en: optEn, ar: str(opt["label_ar"]) || optEn } }];
  });
  if (options.length === 0) return null;

  return { ...base, kind: "multi", options };
}

function unitFor(sysName: string): LText {
  const sys = sysName.toLowerCase();
  if (sys === "price") return { en: "KWD", ar: "د.ك" };
  if (sys.includes("mileage")) return { en: "km", ar: "كم" };
  return { en: "", ar: "" };
}

/**
 * Serialises applied filters as repeated query params, the convention 4Sale's
 * own listing pages use: `217[]=1066&217[]=1067`.
 *
 * The published page carries the same string in `data-fs-filters`, so whatever
 * fills the listings slot can forward it to the API verbatim.
 */
export function filtersToQuery(filters: FilterValues): string {
  const params = new URLSearchParams();
  for (const [id, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      for (const v of value) params.append(`${id}[]`, v);
    } else if (isRangeValue(value)) {
      if (value.min != null) params.set(`${id}_min`, String(value.min));
      if (value.max != null) params.set(`${id}_max`, String(value.max));
    } else if (value === true) {
      params.set(id, "1");
    }
  }
  return params.toString();
}

/* ------------------------------------------------------------ atlas search */

/**
 * The service caps a page at 50 however large `limit` is, so asking for more is
 * silently truncated rather than paged.
 */
export const SEARCH_MAX = 50;

export type SearchResults = {
  listings: Listing[];
};

/**
 * One search result mapped onto the shape the builder renders.
 *
 * The payload nests the useful half under `raw`, and the two levels disagree in
 * places (`raw.id` is a number, the outer `id` a string), so both are read with
 * the outer value winning.
 */
function readSearchListing(v: unknown): Listing | null {
  const o = obj(v);
  const raw = obj(o["raw"]);

  const id = str(o["id"]) || str(raw["id"]);
  const title = str(o["title"]) || str(raw["title"]);
  if (!id || !title) return null;

  // Titles are seller-written free text and exist in one language only — there
  // is no `title_ar`. Using the one string for both sides beats rendering an
  // empty card in the Arabic view.
  const name: LText = { en: title, ar: title };

  const local = obj(raw["district_name_localize"]);
  const areaEn = str(local["en"]) || str(raw["district_name"]);
  const area: LText = { en: areaEn, ar: str(local["ar"]) || areaEn };

  const user = obj(raw["user"]);
  // The carousel pages through `thumbs` and appends one "See more" slide, so
  // the dot count is the array length + 1 — not `images_count`.
  const thumbs = Array.isArray(raw["thumbs"]) ? raw["thumbs"].map(str).filter(Boolean) : [];
  const pinned = str(raw["status"]) === "pinned";

  return {
    id,
    title: name,
    price: readPrice(raw["price"]),
    area,
    // The leaf category this listing sits in. Same id space as the category
    // tree, which is what lets a chosen category narrow results client-side
    // while `category_id` on the search endpoint stays behind auth.
    catId: str(raw["cat_id"]) || undefined,
    /*
     * The two badges the real card can show, read the way it reads them.
     *
     * `is_prem` is Featured — the gold crown. It is emphatically **not**
     * `plan_id`: a keyword search returns plan ids 311, 59 and 326 across six
     * ordinary results, so `plan_id` only means "has a paid plan", which nearly
     * every listing does. Badging on it marked every card Featured.
     *
     * Both flags come back unset on most keyword results, which is correct —
     * the real search grid shows Featured on roughly one card in six.
     */
    featured: raw["is_prem"] === true || undefined,
    pinned: pinned || undefined,
    // The 300px thumb is the right size for the picker grid and the card;
    // `image` is the 1000px original.
    image: str(raw["thumb"]) || str(o["image"]) || undefined,
    url: str(o["url"]) || undefined,
    // A pinned listing shows "Pinned today" in place of its age.
    since: pinned
      ? { en: "Pinned today", ar: "مثبت اليوم" }
      : formatSince(str(raw["date_sort"]) || str(raw["date_published"])),
    // `contact` and `phone` hold the same digits; either may be blank.
    phone: str(raw["phone"]) || str(raw["contact"]) || undefined,
    chat: raw["is_pm_enabled"] === true || undefined,
    thumbs: thumbs.length ? thumbs : undefined,
    // Only a verified seller gets an avatar at all, so the flag gates the logo
    // rather than the logo gating itself.
    verified: raw["is_verified"] === true || undefined,
    vendorLogo:
      raw["is_verified"] === true ? str(raw["logo"]) || str(user["image"]) || undefined : undefined,
  };
}

/**
 * Labels for the card's contact row.
 *
 * Here rather than in either renderer because the canvas and the publish
 * serializer both draw this row, and a label that drifted between them would
 * mean the preview and the published page disagreed about what a button says.
 */
/**
 * Whether a listings block draws contact buttons on its cards.
 *
 * Missing reads as **on**: blocks saved before the toggle existed carry no
 * `cardCtas` key, and they were rendering the buttons, so absence has to keep
 * meaning the same thing rather than silently stripping them.
 */
export const readCardCtas = (v: unknown): boolean => v !== false;

export const ACTION_LABEL = {
  call: { en: "Call", ar: "اتصال" },
  whatsapp: { en: "WhatsApp", ar: "واتساب" },
  chat: { en: "Chat", ar: "دردشة" },
} as const;

/** Titles inside the Call / WhatsApp contact window, as q84sale.com writes them. */
export const CONTACT_DIALOG = {
  call: { en: "Call Now", ar: "اتصل الآن" },
  whatsapp: { en: "Whatsapp", ar: "واتساب" },
} as const;

const LISTING_ORIGIN = "https://www.q84sale.com";

/**
 * The listing's page on q84sale.com.
 *
 * Chat and Favourite cannot open in-app sessions from a landing page, so they
 * go here instead — the same destination a search-card click on 4Sale uses.
 * A stored `url` wins; otherwise the id is enough for `/ {lang} /listing/{id}`,
 * which 4Sale resolves to the current slug.
 */
export function listingDetailsUrl(listing: Pick<Listing, "id" | "url">, lang: Lang): string {
  const stored = listing.url?.trim() ?? "";
  if (stored) {
    if (/^https?:\/\//i.test(stored)) return stored;
    if (stored.startsWith("/")) return `${LISTING_ORIGIN}${stored}`;
    return stored;
  }
  if (!listing.id) return "";
  return `${LISTING_ORIGIN}/${lang}/listing/${encodeURIComponent(listing.id)}`;
}

/** Digits only, as `tel:` and `wa.me` want them. */
export function listingPhoneDigits(phone: string | undefined): string {
  return phone?.replace(/\D/g, "") ?? "";
}

/** `+965…` — the form the contact window prints next to the icon. */
export function listingPhoneDisplay(digits: string): string {
  if (!digits) return "";
  return digits.startsWith("00") ? `+${digits.slice(2)}` : `+${digits}`;
}

/* --------------------------------------------------- card specification line */

/** One category's attributes, as `attr id → { label, option labels }`. */
type AttrIndex = Map<
  string,
  { sysName: string; numeric: boolean; boolean: boolean; options: Map<string, LText> }
>;

/**
 * Attribute schemas, keyed by category id.
 *
 * A grid of 24 cards is usually two or three categories, so without this the
 * same schema would be fetched once per card. Kept for the page's lifetime:
 * category attributes change on the scale of product decisions, not sessions.
 */
const attrCache = new Map<string, Promise<AttrIndex>>();

/**
 * The attribute schema for a category, including everything it inherits.
 *
 * Note this is `/attributes`, **not** `/attributes/with-parent` — the names are
 * the opposite way round to what they suggest. `/attributes` on the 5 Series
 * leaf returns all 43 Used Cars attributes (Year, Mileage, Colour and the
 * rest), while `/attributes/with-parent` returns only the one attribute the
 * leaf defines itself. That is what makes a spec line possible from a listing's
 * own `cat_id` alone, with no walk up the category tree.
 */
function fetchAttrIndex(catId: string): Promise<AttrIndex> {
  const hit = attrCache.get(catId);
  if (hit) return hit;

  const pending = getJson(`/categories/${encodeURIComponent(catId)}/attributes`)
    .then((json) => {
      const index: AttrIndex = new Map();
      for (const rawAttr of readAttributes(json)) {
        const a = obj(rawAttr);
        const id = str(a["attr_id"]);
        if (!id) continue;
        const en = str(a["label_en"]) || str(a["sys_name"]);
        const options = new Map<string, LText>();
        for (const rawOpt of Array.isArray(a["options"]) ? a["options"] : []) {
          const opt = obj(rawOpt);
          const optId = str(opt["id"]);
          if (!optId) continue;
          const optEn = str(opt["label_en"]);
          options.set(optId, { en: optEn, ar: str(opt["label_ar"]) || optEn });
        }
        index.set(id, {
          sysName: str(a["sys_name"]) || en,
          numeric: str(a["type"]) === "number",
          boolean: str(a["type"]) === "bool",
          options,
        });
      }
      return index;
    })
    // A missing schema costs the spec line, not the card.
    .catch(() => new Map() as AttrIndex);

  attrCache.set(catId, pending);
  return pending;
}

/** How many attributes the line shows before it would start wrapping. */
const SPEC_PARTS = 3;

/**
 * Builds "2024, 80 K Km, Gray" from a listing's `attrs`.
 *
 * The order is the payload's own — cars arrive as year, mileage, colour, which
 * is the order the real card prints — so no per-category list of "which
 * attributes belong on a card" has to be maintained here. Values that the
 * schema cannot resolve are dropped rather than printed as bare ids.
 */
function buildSpecs(rawAttrs: unknown, index: AttrIndex): LText | undefined {
  if (!Array.isArray(rawAttrs)) return undefined;

  const parts: LText[] = [];
  for (const entry of rawAttrs) {
    if (parts.length >= SPEC_PARTS) break;
    const e = obj(entry);
    const attr = index.get(str(e["id"]));
    // Booleans are filtered out of the card's line by the real component, and
    // an unresolved id is dropped rather than printed raw.
    if (!attr || attr.boolean) continue;

    if (attr.numeric) {
      const n = num(e["val"], Number.NaN);
      if (!Number.isFinite(n)) continue;
      parts.push({
        en: formatNumericSpec(attr.sysName, n, "en"),
        ar: formatNumericSpec(attr.sysName, n, "ar"),
      });
      continue;
    }
    const label = attr.options.get(str(e["val"]));
    if (label) parts.push(label);
  }

  if (parts.length === 0) return undefined;
  return {
    en: parts.map((p) => p.en).join(", "),
    ar: parts.map((p) => p.ar).join("، "),
  };
}

/**
 * Units for the numeric attributes that reach a listing card.
 *
 * The real app reads these from `master_data.sqlite` — a server-side file, so a
 * browser cannot ask for them, and Atlas's attribute payload omits the field
 * entirely. Mileage is the only numeric attribute the search card actually
 * prints, and its unit is legible from the live site ("140 K Km"), so it is
 * recorded here. Anything not listed prints its number with no unit rather than
 * inventing one. Keyed on `sys_name`.
 */
const SPEC_UNIT: Record<string, LText> = {
  mileage: { en: "Km", ar: "كم" },
};

/**
 * A number the way 4Sale prints it — `tenKNumFormatter` from the web app.
 *
 * The thresholds are the reason the same odometer field shows up as both
 * "140 K Km" and "4,600 Km": above 9,999 the value is divided by 1,000 and
 * suffixed "K", below that it is printed whole with separators. Sellers enter
 * mileage in both units, so 140000 reads "140 K" while 4600 reads "4,600" —
 * which looks inconsistent on the real site too, and matching it is the point.
 *
 * Millions and billions get the same treatment one and two steps up. Fractions
 * are capped at two digits and only shown when the division produced one.
 */
function tenKNumFormatter(value: number, lang: Lang): string {
  const abs = Math.abs(value);
  const scale = (divisor: number, suffix: string) => {
    const scaled = value / divisor;
    const fraction = Math.abs(scaled) % 1 !== 0 ? 2 : 0;
    return (
      scaled.toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
        minimumFractionDigits: fraction,
        maximumFractionDigits: 2,
      }) + suffix
    );
  };

  if (abs > 999_999_999) return scale(1_000_000_000, " B");
  if (abs > 999_999) return scale(1_000_000, " M");
  if (abs > 9_999) return scale(1_000, " K");
  return scale(1, "");
}

/** A numeric attribute as the card prints it: formatted number, then its unit. */
function formatNumericSpec(sysName: string, value: number, lang: Lang): string {
  const unit = SPEC_UNIT[sysName.toLowerCase()];
  const shown = tenKNumFormatter(value, lang);
  return unit ? `${shown} ${t(unit, lang)}` : shown;
}

/**
 * Units of relative age, largest first, with the web app's own labels.
 *
 * The labels are singular on purpose — the real card reads "Since 3 Hour", not
 * "3 Hours" — and there is deliberately no Year: `getElapsedTime` keeps
 * reporting months past twelve, so a two-year-old listing says "Since 26 Month".
 */
const SINCE_UNITS: { seconds: number; en: string; ar: string }[] = [
  { seconds: 2_592_000, en: "Month", ar: "شهر" },
  { seconds: 604_800, en: "Week", ar: "إسبوع" },
  { seconds: 86_400, en: "Day", ar: "يوم" },
  { seconds: 3_600, en: "Hour", ar: "ساعة" },
  { seconds: 60, en: "Minute", ar: "دقيقة" },
];

/**
 * "Since 3 Hour", the way the real card words it — singular unit, no "ago".
 *
 * The timestamps carry no zone and are Kuwait local (UTC+3), so `Z` is appended
 * rather than letting the browser read them as its own local time, which would
 * shift every card by the viewer's offset.
 *
 * This is resolved once, when the editor previews. A published page is static
 * HTML, so the phrase it ships with is frozen at publish time and drifts from
 * then on — a page published today reads "Since 1 Hour" next week. Making it
 * live needs either a script (which published pages forbid) or for the host to
 * render the block itself.
 */
function formatSince(stamp: string): LText | undefined {
  if (!stamp) return undefined;
  const ms = Date.parse(`${stamp.replace(" ", "T")}+03:00`);
  if (!Number.isFinite(ms)) return undefined;

  const elapsed = (Date.now() - ms) / 1000;
  if (elapsed < 60) return { en: "Now", ar: "الآن" };

  for (const unit of SINCE_UNITS) {
    const n = Math.floor(elapsed / unit.seconds);
    if (n >= 1) return { en: `Since ${n} ${unit.en}`, ar: `منذ ${n} ${unit.ar}` };
  }
  return undefined;
}

/**
 * Prices come back as a bare number with no currency and no consistent unit —
 * a 2024 5 Series reads `17` while a 2010 3 Series reads `1000`. No multiplier
 * is guessed; the number is shown exactly as the service reports it, through
 * the same formatter the real card uses, then suffixed with the currency.
 *
 * The currency is **KWD**, not KD. Both the card and the JSON-LD the web app
 * emits say KWD.
 */
function readPrice(v: unknown): LText {
  const n = typeof v === "number" ? v : Number(str(v));
  if (!Number.isFinite(n) || n <= 0) return { en: "", ar: "" };
  return {
    en: `${tenKNumFormatter(n, "en")} KWD`,
    ar: `${tenKNumFormatter(n, "ar")} د.ك`,
  };
}

/**
 * Keyword search against Atlas.
 *
 * `q` is mandatory upstream — the service answers 400 to a request without one
 * — so an empty keyword resolves to no results instead of a failed request.
 * Do not send `category_id` or `filters`: Atlas forwards those to V4
 * `advancedSearch`, which 502s / times out without its credential.
 */
export async function searchListings(
  keyword: string,
  limit: number,
  page = 1,
): Promise<SearchResults> {
  const q = keyword.trim();
  if (!q) return { listings: [] };

  const params = new URLSearchParams({
    q,
    page: String(page),
    limit: String(Math.min(limit, SEARCH_MAX)),
  });
  const json = await getJson(`/search?${params.toString()}`);

  // The response fans out by source — `4sale` holds classified listings, the
  // rest are business directories and new-car models we do not render.
  const bucket = obj(obj(obj(obj(json)["data"])["results"])["4sale"]);

  // A failing source reports itself inside an otherwise 200 response, with an
  // empty item list. Without this the editor would read a rejected request as
  // "nothing matched" and go looking for a better keyword.
  if (str(bucket["status"]) === "error") {
    throw new Error(str(bucket["error"]) || "The listings service rejected this search");
  }

  const items = Array.isArray(bucket["normal_items"]) ? bucket["normal_items"] : [];

  const listings = items.flatMap((item) => {
    const listing = readSearchListing(item);
    return listing ? [{ listing, attrs: obj(obj(item)["raw"])["attrs"] }] : [];
  });

  // The spec line needs one schema request per distinct category, so they are
  // fetched together after the results are known rather than per card. A grid
  // is typically two or three categories, and `fetchAttrIndex` caches, so a
  // second search over the same branch costs nothing.
  const catIds = [...new Set(listings.flatMap(({ listing }) => listing.catId ?? []))];
  const indexes = new Map(
    await Promise.all(catIds.map(async (id) => [id, await fetchAttrIndex(id)] as const)),
  );

  for (const { listing, attrs } of listings) {
    const index = listing.catId ? indexes.get(listing.catId) : undefined;
    if (index) listing.specs = buildSpecs(attrs, index);
  }

  // `total` is deliberately not read: the service reports the same 75 for every
  // query, including one that matches nothing, so it is not a match count and
  // showing it would be a fabricated number.
  return { listings: listings.map(({ listing }) => listing) };
}

/* ----------------------------------------------------- reading saved props */

/**
 * Reads a saved cascade out of an element's props.
 *
 * Page trees are `Record<string, unknown>` and are persisted, so anything read
 * back may predate this feature or have been hand-edited. Both readers below
 * drop what they cannot understand rather than throwing — a malformed listings
 * block should render as an unconfigured one, not break the canvas.
 */
/**
 * The free-text search term.
 *
 * Deliberately not trimmed: this feeds a controlled input, and trimming on read
 * would swallow the space between two words as it is typed. `searchListings`
 * trims at the point it builds the query instead.
 */
export function readKeyword(v: unknown): string {
  return str(v);
}

export function readCategoryPath(v: unknown): CategoryPath {
  if (!Array.isArray(v)) return [];
  return v.flatMap((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    const id = str(o["id"]);
    if (!id) return [];
    const name = readLText(o["name"]);
    return [{ id, name: { en: name.en || id, ar: name.ar || id } }];
  });
}

/**
 * Reads applied filters out of an element's props.
 *
 * Values are kept keyed by field id and shaped like the control that produced
 * them, so a saved block can be re-opened against a filter schema that has
 * since changed: unknown keys are simply never rendered, and a field that
 * reappears finds its old value waiting.
 */
export function readFilterValues(v: unknown): FilterValues {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: FilterValues = {};
  for (const [key, raw] of Object.entries(v as Record<string, unknown>)) {
    if (raw === true) out[key] = true;
    else if (Array.isArray(raw)) {
      const ids = raw.map(str).filter((s) => s !== "");
      if (ids.length) out[key] = ids;
    } else if (raw && typeof raw === "object") {
      const o = raw as Record<string, unknown>;
      if ("min" in o || "max" in o) {
        const next: RangeValue = {};
        if (o["min"] !== undefined && o["min"] !== null && o["min"] !== "") {
          const n = num(o["min"], Number.NaN);
          if (Number.isFinite(n)) next.min = n;
        }
        if (o["max"] !== undefined && o["max"] !== null && o["max"] !== "") {
          const n = num(o["max"], Number.NaN);
          if (Number.isFinite(n)) next.max = n;
        }
        if (next.min !== undefined || next.max !== undefined) out[key] = next;
      }
    }
  }
  return out;
}

/**
 * Active filters as removable chips — one per selected option, not per field,
 * so dropping "Salmiya" does not also drop "Hawally".
 *
 * Labels come back as `LText` rather than rendered strings because the same
 * summary is persisted onto the element and re-read by the canvas and the
 * serializer, which each pick their own language.
 */
export function summariseFilters(
  fields: FilterField[],
  values: FilterValues,
): { key: string; field: string; option?: string; label: LText }[] {
  return fields.flatMap((f) => {
    const value = values[f.id];
    if (value === undefined) return [];

    if (f.kind === "toggle") {
      return value === true ? [{ key: f.id, field: f.id, label: f.label }] : [];
    }
    if (f.kind === "range") {
      if (!isRangeValue(value) || (value.min == null && value.max == null)) return [];
      // A bounded slider covering the whole band narrows nothing.
      if (
        f.max > f.min &&
        value.min != null &&
        value.max != null &&
        value.min <= f.min &&
        value.max >= f.max
      ) {
        return [];
      }
      const from = value.min != null ? value.min.toLocaleString("en-US") : "";
      const to = value.max != null ? value.max.toLocaleString("en-US") : "";
      const span = from && to ? `${from}–${to}` : from ? `≥ ${from}` : `≤ ${to}`;
      const unitEn = f.unit.en ? ` ${f.unit.en}` : "";
      const unitAr = f.unit.ar ? ` ${f.unit.ar}` : "";
      return [
        {
          key: f.id,
          field: f.id,
          label: {
            en: `${f.label.en}: ${span}${unitEn}`,
            ar: `${f.label.ar}: ${span}${unitAr}`,
          },
        },
      ];
    }
    if (!Array.isArray(value)) return [];
    return value.flatMap((id) => {
      const opt = f.options.find((o) => o.id === id);
      return opt ? [{ key: `${f.id}:${id}`, field: f.id, option: id, label: opt.label }] : [];
    });
  });
}

/**
 * Reads the persisted filter summary off an element.
 *
 * The canvas and the published page need to *name* the applied filters, but
 * only the picker ever holds the schema those names live in. Storing the
 * rendered labels next to the raw values is what lets both read them without
 * a request.
 */
export function readFilterSummary(v: unknown): LText[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((raw) => {
    const l = readLText(raw);
    return l.en || l.ar ? [l] : [];
  });
}

/** Reads listings cached on the element by a previous preview. */
export function readListingItems(v: unknown): Listing[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    if (!str(o["id"])) return [];
    return [readListing(o)];
  });
}
