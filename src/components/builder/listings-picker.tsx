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
  fetchListings,
  isLiveCatalogue,
  readCategoryPath,
  readFilterValues,
  readListingItems,
  summariseFilters,
} from "@/lib/listings-api";
import { Field, Pill, SelectInput, SliderInput } from "./controls";
import { FilterChips, FilterRail } from "./listings-filters";
import { LucideIcon } from "./renderer";
import { cn } from "@/lib/utils";

/**
 * Category cascade for the listings block, plus the results modal it opens.
 *
 * The editor drills down one dropdown at a time — a new level appears whenever
 * the chosen category has children — and `Show listings` opens the picker on
 * the branch they stopped on. Results land in a modal over a blurred builder
 * rather than inline in the 320px panel, because a listings grid is the one
 * thing in this app that has to be judged at page width.
 *
 * Filtering lives in the modal, not here: narrowing results is only meaningful
 * with the results in view, and 4Sale's own category pages put the two
 * together for the same reason.
 *
 * The chosen listings are written back into the element's props, so the canvas
 * shows what the editor just approved instead of a fixed mock.
 */

const levelLabel = (i: number, total: number) =>
  i === 0 ? "Category" : total > 2 ? `Subcategory ${i}` : "Subcategory";

/**
 * How many results the picker pulls.
 *
 * Deliberately far more than the block will render — the modal is for filtering
 * a realistic pool down to a handful, so it has to hold a pool worth filtering.
 */
const POOL = 48;

export function ListingsEditor({
  props,
  lang,
  update,
}: {
  props: Record<string, unknown>;
  lang: Lang;
  update: (patch: Record<string, unknown>) => void;
}) {
  const path = readCategoryPath(props["categoryPath"]);
  const filters = readFilterValues(props["filters"]);
  const items = readListingItems(props["items"]);
  const count = Number(props["count"]) || 4;

  /** `levels[i]` are the options offered at depth `i`. */
  const [levels, setLevels] = useState<Category[][]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);
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

    // Filters belong to a vertical: mobiles have storage capacity, cars have
    // mileage. Changing the root invalidates the whole schema, so the values go
    // with it — but drilling within a vertical keeps them.
    const rootChanged = next[0]?.id !== path[0]?.id;
    update(rootChanged ? { categoryPath: next, filters: {} } : { categoryPath: next });
  };

  return (
    <>
      {!isLiveCatalogue() && (
        <>
          <Pill tone="warn">API-dependent integration</Pill>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Live inventory requires the 4Sale listings API. Until{" "}
            <code className="rounded bg-neutral-surface px-1">VITE_LISTINGS_API</code> is set, the
            categories, filters and results below are mocked.
          </p>
        </>
      )}

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
          <LucideIcon name="Loader" className="size-3 animate-spin" />
          Loading categories…
        </p>
      )}
      {treeError && <p className="text-[11px] font-medium text-red-600">{treeError}</p>}

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
        <LucideIcon name="Search" className="size-4" />
        {items.length > 0 ? "Edit selection" : "Show listings"}
      </button>

      {items.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {items.length} listing{items.length === 1 ? "" : "s"} on the page.
        </p>
      )}

      {open && (
        <ListingsModal
          path={path}
          lang={lang}
          count={count}
          filters={filters}
          initialItems={items}
          onFiltersChange={(next, fields) =>
            // The rendered labels are persisted next to the raw values because
            // only the picker ever holds the filter schema — the canvas and the
            // published page have no way to look up what `storage: ["256"]`
            // is called.
            update({
              filters: next,
              filterSummary: summariseFilters(fields, next).map((c) => c.label),
            })
          }
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

/** Stable regardless of key order, so re-renders do not look like new queries. */
const stableKey = (filters: FilterValues) =>
  JSON.stringify(
    Object.keys(filters)
      .sort()
      .map((k) => [k, filters[k]]),
  );

/**
 * Full-screen results picker.
 *
 * `fixed inset-0` with `backdrop-blur` puts the whole builder out of focus
 * behind it, which is the point: the editor is judging a listings grid at page
 * width, not editing the page underneath.
 *
 * The selection is held as a map rather than a set of ids because it has to
 * survive re-filtering — tick three cars, narrow the price band, and the three
 * you already chose must still be there to submit even though the result set
 * they came from is gone.
 */
function ListingsModal({
  path,
  lang,
  count,
  filters,
  initialItems,
  onFiltersChange,
  onClose,
  onApply,
}: {
  path: CategoryPath;
  lang: Lang;
  count: number;
  filters: FilterValues;
  initialItems: Listing[];
  onFiltersChange: (next: FilterValues, fields: FilterField[]) => void;
  onClose: () => void;
  onApply: (items: Listing[]) => void;
}) {
  const [fields, setFields] = useState<FilterField[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Map<string, Listing>>(
    () => new Map(initialItems.map((l) => [l.id, l])),
  );

  const pathKey = path.map((p) => p.id).join("/");
  const filtersKey = stableKey(filters);

  // Read through refs so the query effect can key off the serialised filters
  // without re-running on every parent render.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingFields(true);
      try {
        const found = await fetchFilters(path);
        if (!cancelled) setFields(found);
      } catch {
        // A missing filter schema is not worth blocking the results over; the
        // rail simply renders empty.
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

  // Debounced so dragging a price slider does not fire a request per pixel.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const found = await fetchListings(path, POOL, filtersRef.current);
          if (cancelled) return;
          setListings(found);

          // First result set only: pre-tick enough for the block so the common
          // case is one click. Re-running it after a filter change would keep
          // overwriting a selection the editor is in the middle of making.
          if (!seeded.current) {
            seeded.current = true;
            setSelected(new Map(found.slice(0, countRef.current).map((l) => [l.id, l])));
          }
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : "Could not load listings");
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathKey, filtersKey]);

  const toggle = (l: Listing) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (!next.delete(l.id)) next.set(l.id, l);
      return next;
    });

  const pageSelected = listings.length > 0 && listings.every((l) => selected.has(l.id));

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (pageSelected) for (const l of listings) next.delete(l.id);
      else for (const l of listings) next.set(l.id, l);
      return next;
    });

  // Emitted in the order they were ticked, which is the order the tray shows —
  // the results order is not stable across filter changes, so it cannot be the
  // one that decides page layout.
  const apply = () => onApply([...selected.values()]);

  const crumb = path.length ? path.map((p) => t(p.name, lang)).join(" › ") : "All categories";
  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  /** The schema is only in scope here, so the parent is handed it with the
   *  values it needs to label them. */
  const changeFilters = (next: FilterValues) => onFiltersChange(next, fields);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select listings"
        onClick={stop}
        className="flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-background shadow-lift"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Select listings</h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{crumb}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-neutral-surface hover:text-foreground"
          >
            <LucideIcon name="X" className="size-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="w-60 shrink-0 overflow-y-auto border-e border-border bg-neutral-surface/30">
            <FilterRail
              fields={fields}
              values={filters}
              lang={lang}
              loading={loadingFields}
              onChange={changeFilters}
            />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="space-y-2 border-b border-border px-5 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs font-medium text-foreground/70">
                  {loading && <LucideIcon name="Loader" className="size-3 animate-spin" />}
                  {loading
                    ? "Loading…"
                    : `${listings.length} result${listings.length === 1 ? "" : "s"}`}
                </span>
                {listings.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-brand transition hover:bg-brand-soft"
                  >
                    {pageSelected ? "Deselect these" : "Select all"}
                  </button>
                )}
              </div>
              <FilterChips fields={fields} values={filters} lang={lang} onChange={changeFilters} />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {error ? (
                <p className="py-12 text-center text-sm font-medium text-red-600">{error}</p>
              ) : listings.length === 0 && !loading ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No listings matched these filters.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {listings.map((l) => {
                    const on = selected.has(l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(l)}
                        className={cn(
                          "relative overflow-hidden rounded-xl border bg-background text-start transition",
                          on
                            ? "border-brand ring-2 ring-brand/20"
                            : "border-border opacity-70 hover:opacity-100",
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
                          {on && <LucideIcon name="Check" className="size-3.5" />}
                        </span>

                        <span className="flex h-24 items-center justify-center bg-neutral-surface">
                          {l.image ? (
                            <img src={l.image} alt="" className="size-full object-cover" />
                          ) : (
                            <LucideIcon name="Image" className="size-6 text-muted-foreground/60" />
                          )}
                        </span>
                        <span className="block space-y-1 p-3">
                          {l.tag && (
                            <span className="block">
                              <Pill>{l.tag}</Pill>
                            </span>
                          )}
                          <span className="line-clamp-2 block text-sm font-medium text-foreground">
                            {t(l.title, lang)}
                          </span>
                          <span className="block text-sm font-semibold text-brand">{l.price}</span>
                          <span className="block text-xs text-muted-foreground">
                            {t(l.area, lang)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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
 * The running selection, kept visible across filter changes.
 *
 * Lifted from DAAD's watchlist: without it, narrowing the filters silently
 * discards everything already picked, because the results those picks came from
 * are no longer on screen.
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
                <LucideIcon name="X" className="size-3" />
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
