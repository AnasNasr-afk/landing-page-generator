import type { LText } from "./builder-types";

/**
 * The 4Sale catalogue and listings API.
 *
 * The listings block needs two things: the category tree, fetched **one level at
 * a time** because the editor drills into it (Cars → Toyota → Land Cruiser →
 * …), and the listings that match whatever branch they landed on.
 *
 * Everything the builder touches goes through the narrow `Category` / `Listing`
 * shapes below. 4Sale's own payloads are read in `readCategory` / `readListing`
 * and nowhere else, so pointing this at the real service is a change to two
 * functions rather than a change to the panel, the modal and the renderer.
 *
 * With no base URL configured the module serves a small mock tree, so the block
 * is demonstrable with no backend running — the state the rest of this
 * prototype is in. Set `VITE_LISTINGS_API` to go live.
 */

const BASE = ((import.meta.env["VITE_LISTINGS_API"] as string | undefined) ?? "").replace(
  /\/$/,
  "",
);

/** True when a real service is configured; drives the panel's "mocked" hint. */
export const isLiveCatalogue = () => BASE !== "";

/** One node of the category tree. */
export type Category = {
  id: string;
  name: LText;
  /** Whether drilling in is possible — decides if another dropdown appears. */
  hasChildren: boolean;
};

export type Listing = {
  id: string;
  title: LText;
  price: string;
  area: LText;
  tag?: string | undefined;
  image?: string | undefined;
  url?: string | undefined;
};

/** A selected branch, root first. The last entry is what gets queried. */
export type CategoryPath = { id: string; name: LText }[];

export type FilterOption = { id: string; label: LText };

type FilterBase = {
  id: string;
  label: LText;
  /** Secondary fields start collapsed behind "More filters". */
  primary: boolean;
};

/**
 * One filter control, described by the server rather than hardcoded here.
 *
 * Which filters exist depends entirely on the category — a car has a year and a
 * gearbox, an apartment has bedrooms and a floor area — so the panel renders
 * whatever `fetchFilters` returns instead of switching on the category itself.
 */
export type FilterField =
  | (FilterBase & { kind: "multi"; options: FilterOption[] })
  | (FilterBase & { kind: "range"; min: number; max: number; step: number; unit: LText })
  | (FilterBase & { kind: "toggle" });

export type RangeValue = { min: number; max: number };

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
    id: str(o["id"]) || str(o["slug"]),
    name: readLText(o["name"], o["name_ar"]),
    hasChildren:
      o["hasChildren"] === true ||
      o["has_children"] === true ||
      (Array.isArray(children) && children.length > 0),
  };
}

function readListing(v: unknown): Listing {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    id: str(o["id"]),
    title: readLText(o["title"], o["title_ar"]),
    price: str(o["price"]),
    area: readLText(o["area"], o["area_ar"]),
    tag: str(o["tag"]) || undefined,
    image: str(o["image"]) || undefined,
    url: str(o["url"]) || undefined,
  };
}

/**
 * Reads a filter definition, defaulting to a multi-select.
 *
 * An unrecognised `kind` becomes a checkbox list of whatever options came with
 * it, which degrades to an empty group rather than crashing the panel when the
 * service grows a control this build has never heard of.
 */
function readFilterField(v: unknown): FilterField | null {
  const o = (v ?? {}) as Record<string, unknown>;
  const id = str(o["id"]) || str(o["key"]);
  if (!id) return null;

  const base: FilterBase = {
    id,
    label: readLText(o["label"] ?? o["name"], o["label_ar"] ?? o["name_ar"]),
    primary: o["primary"] !== false,
  };
  const kind = str(o["kind"]) || str(o["type"]);

  if (kind === "toggle" || kind === "boolean") return { ...base, kind: "toggle" };

  if (kind === "range") {
    return {
      ...base,
      kind: "range",
      min: num(o["min"], 0),
      max: num(o["max"], 100),
      step: num(o["step"], 1),
      unit: readLText(o["unit"], o["unit_ar"]),
    };
  }

  const options = readArray(o["options"] ?? o["values"]).flatMap((raw) => {
    const opt = (raw ?? {}) as Record<string, unknown>;
    const optId = str(opt["id"]) || str(opt["value"]);
    if (!optId) return [];
    return [{ id: optId, label: readLText(opt["label"] ?? opt["name"], opt["label_ar"]) }];
  });
  return { ...base, kind: "multi", options };
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
  if (!isLiveCatalogue()) return mockCategories(parentId);

  const path = parentId ? `/categories/${encodeURIComponent(parentId)}/children` : `/categories`;
  return readArray(await getJson(path))
    .map(readCategory)
    .filter((c) => c.id !== "");
}

/**
 * The filters available for a branch.
 *
 * Facets are a property of the category, not of the site: mobiles are filtered
 * by storage capacity, cars by year and mileage. Asking the server which
 * controls to draw is what keeps the block from carrying a hardcoded list that
 * goes stale the moment 4Sale adds a facet.
 *
 * Filters hang off the deepest selected category and fall back up the branch,
 * so picking Electronics alone still offers condition and price.
 */
export async function fetchFilters(path: CategoryPath): Promise<FilterField[]> {
  if (!isLiveCatalogue()) return mockFilters(path);

  const leaf = path[path.length - 1];
  if (!leaf) return [];
  return readArray(await getJson(`/categories/${encodeURIComponent(leaf.id)}/filters`)).flatMap(
    (raw) => {
      const field = readFilterField(raw);
      return field ? [field] : [];
    },
  );
}

/**
 * Serialises applied filters as repeated query params, the convention 4Sale's
 * own listing pages use: `condition[]=new&condition[]=used&price_min=…`.
 *
 * The published page carries the same string in `data-fs-filters`, so whatever
 * fills the listings slot can forward it to the API verbatim.
 */
export function filtersToQuery(filters: FilterValues): string {
  const params = new URLSearchParams();
  filterParams(filters, params);
  return params.toString();
}

function filterParams(filters: FilterValues, params: URLSearchParams): void {
  for (const [id, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      for (const v of value) params.append(`${id}[]`, v);
    } else if (isRangeValue(value)) {
      params.set(`${id}_min`, String(value.min));
      params.set(`${id}_max`, String(value.max));
    } else if (value === true) {
      params.set(id, "1");
    }
  }
}

export async function fetchListings(
  path: CategoryPath,
  limit: number,
  filters: FilterValues = {},
): Promise<Listing[]> {
  if (!isLiveCatalogue()) return mockListings(path, limit, filters);

  const leaf = path[path.length - 1];
  const params = new URLSearchParams({ limit: String(limit) });
  if (leaf) params.set("category", leaf.id);
  filterParams(filters, params);
  return readArray(await getJson(`/listings?${params.toString()}`))
    .map(readListing)
    .filter((l) => l.title.en !== "" || l.title.ar !== "");
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
      if ("min" in o || "max" in o) out[key] = { min: num(o["min"], 0), max: num(o["max"], 0) };
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
      // A range covering the whole band narrows nothing, so it is not a chip.
      if (!isRangeValue(value) || (value.min <= f.min && value.max >= f.max)) return [];
      const span = `${value.min.toLocaleString("en-US")}–${value.max.toLocaleString("en-US")}`;
      return [
        {
          key: f.id,
          field: f.id,
          label: {
            en: `${f.label.en}: ${span}${f.unit.en ? ` ${f.unit.en}` : ""}`,
            ar: `${f.label.ar}: ${span}${f.unit.ar ? ` ${f.unit.ar}` : ""}`,
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

/* ------------------------------------------------------------------ *
 * Mock catalogue — used until VITE_LISTINGS_API points somewhere real.
 * ------------------------------------------------------------------ */

/** Top-level branches double as the key for which listing generator to use. */
type Domain = "cars" | "realestate" | "electronics" | "furniture" | "services" | "heavy" | "jobs";

type MockNode = { id: string; en: string; ar: string; children?: MockNode[] };

const MOCK_TREE: MockNode[] = [
  {
    id: "cars",
    en: "Cars",
    ar: "سيارات",
    children: [
      {
        id: "cars-toyota",
        en: "Toyota",
        ar: "تويوتا",
        children: [
          { id: "cars-toyota-landcruiser", en: "Land Cruiser", ar: "لاند كروزر" },
          { id: "cars-toyota-prado", en: "Prado", ar: "برادو" },
          { id: "cars-toyota-camry", en: "Camry", ar: "كامري" },
          { id: "cars-toyota-corolla", en: "Corolla", ar: "كورولا" },
        ],
      },
      {
        id: "cars-nissan",
        en: "Nissan",
        ar: "نيسان",
        children: [
          { id: "cars-nissan-patrol", en: "Patrol", ar: "باترول" },
          { id: "cars-nissan-altima", en: "Altima", ar: "التيما" },
          { id: "cars-nissan-xtrail", en: "X-Trail", ar: "إكس تريل" },
        ],
      },
      {
        id: "cars-lexus",
        en: "Lexus",
        ar: "لكزس",
        children: [
          { id: "cars-lexus-lx", en: "LX 600", ar: "إل إكس 600" },
          { id: "cars-lexus-es", en: "ES 350", ar: "إي إس 350" },
        ],
      },
      {
        id: "cars-chevrolet",
        en: "Chevrolet",
        ar: "شيفروليه",
        children: [
          { id: "cars-chevrolet-tahoe", en: "Tahoe", ar: "تاهو" },
          { id: "cars-chevrolet-malibu", en: "Malibu", ar: "ماليبو" },
        ],
      },
    ],
  },
  {
    id: "realestate",
    en: "Real Estate",
    ar: "عقارات",
    children: [
      {
        id: "realestate-apartments",
        en: "Apartments",
        ar: "شقق",
        children: [
          { id: "realestate-apartments-rent", en: "For Rent", ar: "للإيجار" },
          { id: "realestate-apartments-sale", en: "For Sale", ar: "للبيع" },
        ],
      },
      {
        id: "realestate-villas",
        en: "Villas",
        ar: "فلل",
        children: [
          { id: "realestate-villas-rent", en: "For Rent", ar: "للإيجار" },
          { id: "realestate-villas-sale", en: "For Sale", ar: "للبيع" },
        ],
      },
      { id: "realestate-chalets", en: "Chalets", ar: "شاليهات" },
      { id: "realestate-land", en: "Land", ar: "أراضي" },
    ],
  },
  {
    id: "electronics",
    en: "Electronics",
    ar: "إلكترونيات",
    children: [
      {
        id: "electronics-mobiles",
        en: "Mobiles",
        ar: "هواتف",
        children: [
          { id: "electronics-mobiles-iphone", en: "iPhone", ar: "آيفون" },
          { id: "electronics-mobiles-samsung", en: "Samsung", ar: "سامسونج" },
          { id: "electronics-mobiles-xiaomi", en: "Xiaomi", ar: "شاومي" },
        ],
      },
      {
        id: "electronics-laptops",
        en: "Laptops",
        ar: "لابتوبات",
        children: [
          { id: "electronics-laptops-macbook", en: "MacBook", ar: "ماك بوك" },
          { id: "electronics-laptops-dell", en: "Dell", ar: "ديل" },
        ],
      },
      { id: "electronics-gaming", en: "Gaming", ar: "ألعاب" },
    ],
  },
  {
    id: "furniture",
    en: "Furniture",
    ar: "أثاث",
    children: [
      { id: "furniture-living", en: "Living Room", ar: "غرف معيشة" },
      { id: "furniture-bedroom", en: "Bedroom", ar: "غرف نوم" },
      { id: "furniture-office", en: "Office", ar: "أثاث مكتبي" },
    ],
  },
  {
    id: "services",
    en: "Services",
    ar: "خدمات",
    children: [
      { id: "services-moving", en: "Moving", ar: "نقل عفش" },
      { id: "services-cleaning", en: "Cleaning", ar: "تنظيف" },
      { id: "services-maintenance", en: "Maintenance", ar: "صيانة" },
    ],
  },
  {
    id: "heavy",
    en: "Heavy Equipment",
    ar: "معدات ثقيلة",
    children: [
      { id: "heavy-trucks", en: "Trucks", ar: "شاحنات" },
      { id: "heavy-forklifts", en: "Forklifts", ar: "رافعات شوكية" },
    ],
  },
  {
    id: "jobs",
    en: "Jobs",
    ar: "وظائف",
    children: [
      { id: "jobs-fulltime", en: "Full-time", ar: "دوام كامل" },
      { id: "jobs-parttime", en: "Part-time", ar: "دوام جزئي" },
    ],
  },
];

function findNode(id: string, nodes: MockNode[] = MOCK_TREE): MockNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = n.children && findNode(id, n.children);
    if (hit) return hit;
  }
  return undefined;
}

/** Mirrors the network shape, latency included, so loading states are real. */
const settle = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 260));

function mockCategories(parentId?: string): Promise<Category[]> {
  const nodes = parentId ? (findNode(parentId)?.children ?? []) : MOCK_TREE;
  return settle(
    nodes.map((n) => ({
      id: n.id,
      name: { en: n.en, ar: n.ar },
      hasChildren: !!n.children?.length,
    })),
  );
}

/* ------------------------------------------------------ mock listing bodies */

const AREAS: { id: string; name: LText }[] = [
  { id: "kuwait-city", name: { en: "Kuwait City", ar: "مدينة الكويت" } },
  { id: "hawally", name: { en: "Hawally", ar: "حولي" } },
  { id: "salmiya", name: { en: "Salmiya", ar: "السالمية" } },
  { id: "jahra", name: { en: "Jahra", ar: "الجهراء" } },
  { id: "farwaniya", name: { en: "Farwaniya", ar: "الفروانية" } },
  { id: "ahmadi", name: { en: "Ahmadi", ar: "الأحمدي" } },
  { id: "mangaf", name: { en: "Mangaf", ar: "المنقف" } },
  { id: "fintas", name: { en: "Fintas", ar: "الفنطاس" } },
];

/** Cycles a fixed table — every generator below indexes by result position. */
const pick = <T>(list: T[], i: number): T => list[i % list.length] as T;

const kd = (n: number) => `${n.toLocaleString("en-US")} KD`;

const CAR_TRIMS: LText[] = [
  { en: "GXR", ar: "GXR" },
  { en: "VXR", ar: "VXR" },
  { en: "EXR", ar: "EXR" },
  { en: "Limited", ar: "ليمتد" },
];

const CONDITIONS: { id: string; name: LText }[] = [
  { id: "new", name: { en: "New", ar: "جديد" } },
  { id: "like-new", name: { en: "Like new", ar: "شبه جديد" } },
  { id: "used", name: { en: "Used", ar: "مستعمل" } },
];

const STORAGE = [128, 256, 512, 64];

/**
 * Deterministic spread across a range.
 *
 * The generators used to walk prices down linearly, which ran negative once the
 * pool grew past a dozen and left every filter matching the same contiguous
 * block. Stepping by a co-prime multiple scatters values over the whole band
 * while staying stable for a given index.
 */
const spread = (i: number, min: number, max: number, step: number): number => {
  const span = Math.floor((max - min) / step) + 1;
  return min + ((i * 7) % span) * step;
};

/** Hidden per-listing values the mock filters match against. */
type Facets = Record<string, string | number | boolean>;

type Body = { title: LText; price: string; amount: number; tag: string; facets: Facets };

/**
 * One generator per top-level branch.
 *
 * A single generic generator produced "For Rent 2023 — 16,400 KD" for an
 * apartment, which makes the preview useless for judging whether the block
 * looks right. Each domain gets titles and a price scale that belong to it, so
 * drilling into a different branch visibly changes the results.
 */
const BODIES: Record<Domain, (leaf: LText, i: number) => Body> = {
  cars: (leaf, i) => {
    const trim = pick(CAR_TRIMS, i);
    // Spans the full range `yearFilter` offers — a year option that no listing
    // carries makes the filter look broken.
    const year = 2025 - (i % 16);
    const amount = spread(i, 2500, 24000, 250);
    return {
      title: { en: `${leaf.en} ${trim.en} ${year}`, ar: `${leaf.ar} ${trim.ar} ${year}` },
      price: kd(amount),
      amount,
      tag: pick(["Verified", "Featured", "New"], i),
      facets: {
        year: String(year),
        mileage: spread(i, 0, 260000, 5000),
        transmission: i % 5 === 0 ? "manual" : "automatic",
        condition: pick(CONDITIONS, i).id,
      },
    };
  },
  realestate: (leaf, i) => {
    const beds = 1 + (i % 5);
    const size = spread(i, 60, 600, 10);
    const amount = spread(i, 180, 1400, 20);
    return {
      title: {
        en: `${beds}-Bedroom ${leaf.en} · ${size} m²`,
        ar: `${leaf.ar} · ${beds} غرف · ${size} م²`,
      },
      price: `${kd(amount)}/mo`,
      amount,
      tag: pick(["Verified", "Featured"], i),
      facets: { bedrooms: String(beds), size, furnished: i % 3 === 0 },
    };
  },
  electronics: (leaf, i) => {
    const cond = pick(CONDITIONS, i);
    const storage = pick(STORAGE, i);
    const amount = spread(i, 25, 480, 5);
    return {
      title: {
        en: `${leaf.en} ${storage}GB — ${cond.name.en}`,
        ar: `${leaf.ar} ${storage} جيجا — ${cond.name.ar}`,
      },
      price: kd(amount),
      amount,
      tag: pick(["New", "Verified", "Featured"], i),
      facets: { storage: String(storage), condition: cond.id },
    };
  },
  furniture: (leaf, i) => {
    const cond = pick(CONDITIONS, i);
    const amount = spread(i, 15, 600, 5);
    return {
      title: {
        en: `${leaf.en} set — ${cond.name.en}`,
        ar: `طقم ${leaf.ar} — ${cond.name.ar}`,
      },
      price: kd(amount),
      amount,
      tag: pick(["Featured", "Verified"], i),
      facets: { condition: cond.id },
    };
  },
  services: (leaf, i) => {
    const amount = spread(i, 10, 120, 5);
    return {
      title: {
        en: `${leaf.en} — same-day service`,
        ar: `${leaf.ar} — خدمة في نفس اليوم`,
      },
      price: `From ${kd(amount)}`,
      amount,
      tag: pick(["Verified", "Featured"], i),
      facets: {},
    };
  },
  heavy: (leaf, i) => {
    const year = 2025 - (i % 18);
    const amount = spread(i, 3500, 42000, 500);
    return {
      title: { en: `${leaf.en} ${year}`, ar: `${leaf.ar} ${year}` },
      price: kd(amount),
      amount,
      tag: pick(["Verified", "Featured"], i),
      facets: { year: String(year), condition: pick(CONDITIONS, i).id },
    };
  },
  jobs: (leaf, i) => {
    const roles: LText[] = [
      { en: "Sales Representative", ar: "مندوب مبيعات" },
      { en: "Accountant", ar: "محاسب" },
      { en: "Driver", ar: "سائق" },
      { en: "Technician", ar: "فني" },
    ];
    const role = pick(roles, i);
    const amount = spread(i, 250, 1500, 25);
    return {
      title: { en: `${role.en} — ${leaf.en}`, ar: `${role.ar} — ${leaf.ar}` },
      price: `${kd(amount)}/mo`,
      amount,
      tag: pick(["Urgent", "Verified"], i),
      facets: { experience: pick(["entry", "mid", "senior"], i) },
    };
  },
};

/**
 * How many results the mock service holds per branch.
 *
 * Larger than anything the block renders, because the point of the picker is to
 * filter a realistic pool down — a pool the size of the grid would make every
 * filter look like it did nothing.
 */
const MOCK_POOL = 60;

/**
 * Applies saved filter values to a listing's hidden facets.
 *
 * A facet the listing does not carry is ignored rather than treated as a
 * mismatch, so a filter left over from a different category cannot silently
 * empty the results.
 */
function matchesFilters(facets: Facets, filters: FilterValues): boolean {
  for (const [id, value] of Object.entries(filters)) {
    const actual = facets[id];
    if (actual === undefined) continue;

    if (Array.isArray(value)) {
      if (value.length > 0 && !value.includes(String(actual))) return false;
    } else if (isRangeValue(value)) {
      if (typeof actual === "number" && (actual < value.min || actual > value.max)) return false;
    } else if (value === true && actual !== true) {
      return false;
    }
  }
  return true;
}

/**
 * Plausible results for whichever branch was chosen.
 *
 * Deterministic: the same path always yields the same listings, so re-opening
 * the preview does not reshuffle what the editor just looked at.
 */
function mockListings(
  path: CategoryPath,
  limit: number,
  filters: FilterValues,
): Promise<Listing[]> {
  const root = path[0]?.id;
  const leaf = path[path.length - 1];
  const label: LText = leaf?.name ?? { en: "Listing", ar: "إعلان" };
  const body = root && root in BODIES ? BODIES[root as Domain] : BODIES.cars;

  const pool = Array.from({ length: MOCK_POOL }, (_, i) => {
    const { title, price, amount, tag, facets } = body(label, i);
    const area = pick(AREAS, i);
    return {
      listing: {
        id: `mock-${leaf?.id ?? "any"}-${i}`,
        title,
        price,
        area: area.name,
        tag,
      },
      facets: { ...facets, price: amount, area: area.id, verified: tag === "Verified" },
    };
  });

  return settle(
    pool
      .filter((entry) => matchesFilters(entry.facets, filters))
      .slice(0, Math.max(1, limit))
      .map((entry) => entry.listing),
  );
}

/* ------------------------------------------------------------ mock filters */

const lt = (en: string, ar: string): LText => ({ en, ar });

const opts = (list: [string, string, string][]): FilterOption[] =>
  list.map(([id, en, ar]) => ({ id, label: { en, ar } }));

const AREA_FILTER: FilterField = {
  id: "area",
  label: lt("Area", "المنطقة"),
  primary: true,
  kind: "multi",
  options: AREAS.map((a) => ({ id: a.id, label: a.name })),
};

const VERIFIED_FILTER: FilterField = {
  id: "verified",
  label: lt("Verified sellers only", "معلنون موثوقون فقط"),
  primary: false,
  kind: "toggle",
};

const CONDITION_FILTER: FilterField = {
  id: "condition",
  label: lt("Condition", "الحالة"),
  primary: true,
  kind: "multi",
  options: CONDITIONS.map((c) => ({ id: c.id, label: c.name })),
};

const priceFilter = (min: number, max: number, step: number, label?: LText): FilterField => ({
  id: "price",
  label: label ?? lt("Price", "السعر"),
  primary: true,
  kind: "range",
  min,
  max,
  step,
  unit: lt("KD", "د.ك"),
});

const yearFilter = (from: number, to: number): FilterField => ({
  id: "year",
  label: lt("Year", "سنة الصنع"),
  primary: true,
  kind: "multi",
  options: Array.from({ length: to - from + 1 }, (_, k) => {
    const y = String(to - k);
    return { id: y, label: lt(y, y) };
  }),
});

/**
 * Filters per top-level branch.
 *
 * Deliberately different per vertical rather than one shared list: 4Sale's own
 * category pages offer storage capacity under mobiles and mileage under cars,
 * and a schema that did not vary would prove nothing about the plumbing.
 */
const MOCK_FILTERS: Record<Domain, FilterField[]> = {
  cars: [
    priceFilter(0, 30000, 250),
    yearFilter(2010, 2025),
    {
      id: "transmission",
      label: lt("Transmission", "ناقل الحركة"),
      primary: true,
      kind: "multi",
      options: opts([
        ["automatic", "Automatic", "أوتوماتيك"],
        ["manual", "Manual", "مانيوال"],
      ]),
    },
    AREA_FILTER,
    {
      id: "mileage",
      label: lt("Mileage", "الممشى"),
      primary: false,
      kind: "range",
      min: 0,
      max: 300000,
      step: 5000,
      unit: lt("km", "كم"),
    },
    { ...CONDITION_FILTER, primary: false },
    VERIFIED_FILTER,
  ],
  electronics: [
    CONDITION_FILTER,
    priceFilter(0, 600, 5),
    {
      id: "storage",
      label: lt("Storage capacity", "سعة التخزين"),
      primary: true,
      kind: "multi",
      options: opts([
        ["64", "64 GB", "64 جيجا"],
        ["128", "128 GB", "128 جيجا"],
        ["256", "256 GB", "256 جيجا"],
        ["512", "512 GB", "512 جيجا"],
      ]),
    },
    AREA_FILTER,
    VERIFIED_FILTER,
  ],
  realestate: [
    priceFilter(0, 1600, 20, lt("Rent per month", "الإيجار الشهري")),
    {
      id: "bedrooms",
      label: lt("Bedrooms", "عدد الغرف"),
      primary: true,
      kind: "multi",
      options: opts([
        ["1", "1", "1"],
        ["2", "2", "2"],
        ["3", "3", "3"],
        ["4", "4", "4"],
        ["5", "5+", "+5"],
      ]),
    },
    AREA_FILTER,
    {
      id: "size",
      label: lt("Floor area", "المساحة"),
      primary: false,
      kind: "range",
      min: 50,
      max: 600,
      step: 10,
      unit: lt("m²", "م²"),
    },
    { id: "furnished", label: lt("Furnished", "مفروش"), primary: false, kind: "toggle" },
    VERIFIED_FILTER,
  ],
  furniture: [CONDITION_FILTER, priceFilter(0, 700, 5), AREA_FILTER, VERIFIED_FILTER],
  services: [priceFilter(0, 150, 5), AREA_FILTER, VERIFIED_FILTER],
  heavy: [
    priceFilter(0, 50000, 500),
    yearFilter(2008, 2025),
    { ...CONDITION_FILTER, primary: false },
    AREA_FILTER,
    VERIFIED_FILTER,
  ],
  jobs: [
    priceFilter(0, 2000, 25, lt("Salary", "الراتب")),
    {
      id: "experience",
      label: lt("Experience", "الخبرة"),
      primary: true,
      kind: "multi",
      options: opts([
        ["entry", "Entry level", "مبتدئ"],
        ["mid", "Mid level", "متوسط"],
        ["senior", "Senior", "خبير"],
      ]),
    },
    AREA_FILTER,
    VERIFIED_FILTER,
  ],
};

function mockFilters(path: CategoryPath): Promise<FilterField[]> {
  const root = path[0]?.id;
  if (!root) return settle<FilterField[]>([]);
  return settle(root in MOCK_FILTERS ? MOCK_FILTERS[root as Domain] : MOCK_FILTERS.cars);
}
