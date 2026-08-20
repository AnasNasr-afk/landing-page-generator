import { useCallback, useEffect, useRef, useState } from "react";
import { type Lang, t } from "@/lib/builder-types";
import {
  type Category,
  type CategoryPath,
  type FilterField,
  type FilterValues,
  type Listing,
  fetchCategories,
  fetchFilters,
  isLiveCatalogue,
  readCategoryPath,
  readFilterValues,
  readKeyword,
  readListingItems,
  searchListings,
  summariseFilters,
} from "@/lib/listings-api";
import { Field, Pill, SelectInput, SliderInput, TextInput } from "./controls";
import { FilterChips, FilterRail } from "./listings-filters";
import { UiIcon as Icon } from "./ui-icon";
import { cn } from "@/lib/utils";

/**
 * Category cascade, keyword, and filters for the listings block (right-hand
 * editor), plus the results modal they open.
 *
 * The **category tree is real**, **search is real**, and **filters are real**
 * (`GET /categories/{id}/attributes/with-parent` along the selected path).
 * Search is keyword-only: `category_id` made Atlas call V4 `advancedSearch`,
 * which 502s / times out. A chosen category supplies the search term when no
 * keyword is typed, and narrows results by `cat_id` once you have drilled to a
 * leaf. Selected filters live on the editor and are saved on the block for
 * publish; they do not go on `/search`.
 *
 * Results land in a listings-only modal over a blurred builder — three cards
 * across, same card chrome as the canvas — so the editor is judging a grid at
 * page width, not editing filters next to it.
 */

const levelLabel = (i: number, total: number) =>
  i === 0 ? "Category" : total > 2 ? `Subcategory ${i}` : "Subcategory";

/**
 * How many results each picker page pulls.
 *
 * Atlas caps a page at 50; 30 stays under that and keeps the grid scannable.
 */
const PAGE_SIZE = 30;

export function ListingsEditor({
  props,
  lang,
  update,
}: {
  props: Record<string, unknown>;
  lang: Lang;
  update: (patch: Record<string, unknown>) => void;
}) {
  const keyword = readKeyword(props["keyword"]);
  const path = readCategoryPath(props["categoryPath"]);
  const filters = readFilterValues(props["filters"]);
  const items = readListingItems(props["items"]);
  const count = Number(props["count"]) || 4;

  /** `levels[i]` are the options offered at depth `i`. */
  const [levels, setLevels] = useState<Category[][]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [fields, setFields] = useState<FilterField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [open, setOpen] = useState(false);

  const pathKey = path.map((p) => p.id).join("/");

  // Walks the saved branch on mount and after every selection, so a page
  // reopened days later rebuilds the same set of dropdowns from the server
  // rather than from whatever was cached in the tree.
  useEffect(() => {
    let cancelled = false;
    const ids = pathKey ? pathKey.split("/") : [];

    (async () => {
      setLoadingTree(true);
      setTreeError(null);
      try {
        let options = await fetchCategories();
        const next: Category[][] = [options];
        for (const id of ids) {
          // `hasChildren` lets a leaf end the cascade without spending a
          // request to be told it has no children.
          const picked = options.find((c) => c.id === id);
          if (!picked?.hasChildren) break;
          const children = await fetchCategories(id);
          if (children.length === 0) break;
          next.push(children);
          options = children;
        }
        if (!cancelled) setLevels(next);
      } catch (e) {
        if (!cancelled) setTreeError(e instanceof Error ? e.message : "Could not load categories");
      } finally {
        if (!cancelled) setLoadingTree(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pathKey) {
        setFields([]);
        setLoadingFields(false);
        return;
      }
      setLoadingFields(true);
      try {
        const found = await fetchFilters(path);
        if (!cancelled) setFields(found);
      } catch {
        if (!cancelled) setFields([]);
      } finally {
        if (!cancelled) setLoadingFields(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathKey]);

  const changeFilters = (next: FilterValues) =>
    update({
      filters: next,
      filterSummary: summariseFilters(fields, next).map((c) => c.label),
    });

  /**
   * Selecting at depth `i` discards everything below it — the old deeper
   * choices belong to a branch that is no longer selected, and keeping them
   * would submit a path the editor never picked.
   */
  const select = (i: number, id: string) => {
    const options = levels[i] ?? [];
    const picked = options.find((c) => c.id === id);
    const next = path.slice(0, i);
    if (picked) next.push({ id: picked.id, name: picked.name });

    // Attributes are per category id, so changing the leaf invalidates the
    // saved values — a phone's storage options do not apply to a car.
    const leafChanged = next[next.length - 1]?.id !== path[path.length - 1]?.id;
    update(
      leafChanged ? { categoryPath: next, filters: {}, filterSummary: [] } : { categoryPath: next },
    );
  };

  return (
    <>
      {!isLiveCatalogue() && (
        <>
          <Pill tone="warn">API-dependent integration</Pill>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Live inventory requires the 4Sale APIs. Set{" "}
            <code className="rounded bg-neutral-surface px-1">VITE_LISTINGS_API</code> to the Atlas
            service URL.
          </p>
        </>
      )}

      <Field label="Keyword">
        <TextInput
          value={keyword}
          placeholder="e.g. bmw 520i"
          onChange={(e) => update({ keyword: e.target.value })}
        />
      </Field>

      {levels.map((options, i) => (
        <Field key={i} label={levelLabel(i, levels.length)}>
          <SelectInput
            value={path[i]?.id ?? ""}
            onChange={(v) => select(i, v)}
            options={[
              { value: "", label: i === 0 ? "All categories" : "Any" },
              ...options.map((c) => ({ value: c.id, label: t(c.name, lang) })),
            ]}
          />
        </Field>
      ))}

      {loadingTree && (
        <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Icon name="Loader" className="size-3 animate-spin" />
          Loading categories…
        </p>
      )}
      {treeError && <p className="text-[11px] font-medium text-red-600">{treeError}</p>}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        A keyword on its own is enough, and so is a category. With no keyword, the deepest category
        you pick becomes the search term.
      </p>

      <div className="space-y-2">
        <span className="block text-xs font-medium text-foreground/70">Filters</span>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Saved on the published page. They do not narrow the keyword search in the listings window.
        </p>
        <FilterRail
          fields={fields}
          values={filters}
          lang={lang}
          loading={loadingFields}
          onChange={changeFilters}
          className="p-0"
        />
        <FilterChips fields={fields} values={filters} lang={lang} onChange={changeFilters} />
      </div>

      <Field label="Listings displayed">
        <SliderInput
          value={count}
          min={1}
          max={12}
          step={1}
          suffix=""
          onChange={(v) => update({ count: v })}
        />
      </Field>

      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={loadingTree}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-foreground shadow-brand transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="Search" className="size-4" />
        {items.length > 0 ? "Edit selection" : "Show listings"}
      </button>

      {items.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {items.length} listing{items.length === 1 ? "" : "s"} on the page.
        </p>
      )}

      {open && (
        <ListingsModal
          lang={lang}
          count={count}
          keyword={keyword}
          path={path}
          initialItems={items}
          onKeywordChange={(next) => update({ keyword: next })}
          onClose={() => setOpen(false)}
          onApply={(picked) => {
            // The selection is the block's contents, so `count` follows it —
            // picking six and then rendering four would be a silent lie. The
            // slider stays useful for trimming afterwards.
            update({ items: picked, count: picked.length });
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

/**
 * Full-screen results picker — listings only, three across.
 *
 * `fixed inset-0` with `backdrop-blur` puts the whole builder out of focus
 * behind it, which is the point: the editor is judging a listings grid at page
 * width, not editing filters or the page underneath.
 *
 * Cards match the canvas listing chrome (rounded, short image, title / price /
 * area) so the picker does not inflate them past the usual size. The selection
 * is held as a map rather than a set of ids because it has to survive
 * re-querying — tick three cars, refine the keyword, and the three already
 * chosen must still be there to submit even though the result set they came
 * from is gone.
 */
function ListingsModal({
  lang,
  count,
  keyword,
  path,
  initialItems,
  onKeywordChange,
  onClose,
  onApply,
}: {
  lang: Lang;
  count: number;
  keyword: string;
  path: CategoryPath;
  initialItems: Listing[];
  onKeywordChange: (next: string) => void;
  onClose: () => void;
  onApply: (items: Listing[]) => void;
}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Map<string, Listing>>(
    () => new Map(initialItems.map((l) => [l.id, l])),
  );

  const leaf = path[path.length - 1];

  /**
   * What actually gets sent as `q`.
   *
   * Trimmed, so typing the space between two words does not fire a query for a
   * term the user has not finished. With no keyword the deepest category name
   * stands in — `q` is mandatory upstream, so a category with no search term
   * would otherwise have nothing to send.
   */
  const query = keyword.trim() || (leaf ? leaf.name.en : "");

  const queryRef = useRef(query);
  const countRef = useRef(count);
  countRef.current = count;

  /** Guards the one-time convenience selection below. */
  const seeded = useRef(initialItems.length > 0);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /**
   * Results narrowed to the chosen category, client-side.
   *
   * Only when the selection is a leaf: listings sit at leaf level, so matching
   * `cat_id` against a parent (BMW, Used Cars) would discard everything.
   */
  const narrowed =
    leaf && listings.some((l) => l.catId === leaf.id)
      ? listings.filter((l) => l.catId === leaf.id)
      : listings;
  const narrowing = narrowed.length !== listings.length;

  const hasMore = listings.length >= PAGE_SIZE;

  // Debounced so typing does not fire a request per keystroke. A new keyword
  // or category resets to page 1 before searching, so we never ask Atlas for
  // page 3 of a term we just started typing.
  useEffect(() => {
    if (!query) {
      setListings([]);
      setLoading(false);
      setError(null);
      setPage(1);
      return;
    }

    const queryChanged = queryRef.current !== query;
    if (queryChanged) {
      queryRef.current = query;
      if (page !== 1) {
        setPage(1);
        return;
      }
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = setTimeout(
      () => {
        void (async () => {
          try {
            const found = await searchListings(query, PAGE_SIZE, page);
            if (cancelled) return;
            setListings(found.listings);

            // First result set only: pre-tick enough for the block so the common
            // case is one click. Re-running it after a keyword or page change
            // would keep overwriting a selection the editor is in the middle of.
            if (!seeded.current) {
              seeded.current = true;
              setSelected(new Map(found.listings.slice(0, countRef.current).map((l) => [l.id, l])));
            }
          } catch (e) {
            if (!cancelled) setError(e instanceof Error ? e.message : "Could not load listings");
          } finally {
            if (!cancelled) setLoading(false);
          }
        })();
      },
      queryChanged ? 320 : 0,
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, page]);

  const toggle = (l: Listing) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (!next.delete(l.id)) next.set(l.id, l);
      return next;
    });

  const pageSelected = narrowed.length > 0 && narrowed.every((l) => selected.has(l.id));

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (pageSelected) for (const l of narrowed) next.delete(l.id);
      else for (const l of narrowed) next.set(l.id, l);
      return next;
    });

  // Emitted in the order they were ticked, which is the order the tray shows —
  // the results order is not stable across searches, so it cannot be the one
  // that decides page layout.
  const apply = () => onApply([...selected.values()]);

  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  const crumb = path.length ? path.map((p) => t(p.name, lang)).join(" › ") : "All categories";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-3 backdrop-blur-sm"
      onClick={onClose}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select listings"
        onClick={stop}
        className="flex h-[94vh] w-[96vw] max-w-none flex-col overflow-hidden rounded-2xl bg-background shadow-lift"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Select listings</h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {query ? `${crumb} · searching “${query}”` : "Enter a keyword or pick a category"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-neutral-surface hover:text-foreground"
          >
            <Icon name="X" className="size-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-2 border-b border-border px-5 py-2.5">
            <div className="relative">
              <Icon
                name="Search"
                className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={keyword}
                placeholder="Search listings by keyword…"
                onChange={(e) => onKeywordChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-1.5 pe-8 ps-8 text-xs outline-none transition placeholder:text-muted-foreground focus:border-brand"
              />
              {keyword !== "" && (
                <button
                  type="button"
                  onClick={() => onKeywordChange("")}
                  aria-label="Clear keyword"
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                >
                  <Icon name="X" className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs font-medium text-foreground/70">
                {loading && <Icon name="Loader" className="size-3 animate-spin" />}
                {loading ? "Searching…" : `${narrowed.length} on this page`}
                {!loading && narrowing && (
                  <span className="font-normal text-muted-foreground">
                    in {t(leaf?.name ?? { en: "", ar: "" }, lang)}, of {listings.length} found
                  </span>
                )}
              </span>
              {narrowed.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium text-brand transition hover:bg-brand-soft"
                >
                  {pageSelected ? "Deselect these" : "Select all on this page"}
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {error ? (
              <p className="py-12 text-center text-sm font-medium text-red-600">{error}</p>
            ) : !query ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Type a keyword or pick a category — 4Sale&rsquo;s search needs a term.
              </p>
            ) : narrowed.length === 0 && !loading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {page > 1
                  ? "No more listings on this page."
                  : `Nothing matched “${query}”. Try a shorter term.`}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {narrowed.map((l) => {
                  const on = selected.has(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(l)}
                      className={cn(
                        "relative overflow-hidden rounded-2xl border bg-background text-start shadow-card transition",
                        on
                          ? "border-brand ring-2 ring-brand/20"
                          : "border-border hover:border-brand/40",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute end-2 top-2 z-10 flex size-5 items-center justify-center rounded-md border transition",
                          on
                            ? "border-brand bg-brand text-brand-foreground"
                            : "border-border bg-background/90",
                        )}
                      >
                        {on && <Icon name="Check" className="size-3.5" />}
                      </span>

                      <span className="flex h-28 items-center justify-center bg-neutral-surface">
                        {l.image ? (
                          <img
                            src={l.image}
                            alt=""
                            loading="lazy"
                            className="size-full object-cover"
                          />
                        ) : (
                          <Icon name="Image" className="size-8 text-muted-foreground/60" />
                        )}
                      </span>
                      <span className="block p-3">
                        {l.tag && (
                          <span className="block text-xs font-medium text-brand">{l.tag}</span>
                        )}
                        <span className="mt-1 line-clamp-1 block text-sm font-semibold">
                          {t(l.title, lang)}
                        </span>
                        {t(l.price, lang) && (
                          <span className="mt-1 block text-sm font-bold">{t(l.price, lang)}</span>
                        )}
                        <span className="block text-xs opacity-60">{t(l.area, lang)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {query && !error && (
            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-2.5">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-neutral-surface disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs font-medium text-foreground/70">Page {page}</span>
              <button
                type="button"
                disabled={!hasMore || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-neutral-surface disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>

        <SelectionTray
          selected={selected}
          lang={lang}
          onRemove={(id) =>
            setSelected((prev) => {
              const next = new Map(prev);
              next.delete(id);
              return next;
            })
          }
          onClear={() => setSelected(new Map())}
          onCancel={onClose}
          onApply={apply}
        />
      </div>
    </div>
  );
}

/**
 * The running selection, kept visible across searches.
 *
 * Without it, refining the keyword silently discards everything already picked,
 * because the results those picks came from are no longer on screen.
 */
function SelectionTray({
  selected,
  lang,
  onRemove,
  onClear,
  onCancel,
  onApply,
}: {
  selected: Map<string, Listing>;
  lang: Lang;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCancel: () => void;
  onApply: () => void;
}) {
  const items = [...selected.values()];

  return (
    <footer className="flex items-center gap-3 border-t border-border bg-neutral-surface/40 px-5 py-3">
      <span className="shrink-0 text-xs font-semibold text-foreground">
        Selected {items.length}
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        {items.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            Tick the listings you want on the page.
          </span>
        ) : (
          <>
            {items.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => onRemove(l.id)}
                className="flex shrink-0 items-center gap-1 rounded-full bg-background px-2.5 py-1 text-[11px] font-medium shadow-panel transition hover:text-brand"
              >
                <span className="max-w-40 truncate">{t(l.title, lang)}</span>
                <Icon name="X" className="size-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={onClear}
              className="shrink-0 rounded-full px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
            >
              Clear
            </button>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-background"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={items.length === 0}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add {items.length} listing{items.length === 1 ? "" : "s"}
        </button>
      </div>
    </footer>
  );
}
