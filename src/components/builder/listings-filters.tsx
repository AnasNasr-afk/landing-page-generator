import { useState } from "react";
import { type Lang, t } from "@/lib/builder-types";
import {
  type FilterField,
  type FilterValue,
  type FilterValues,
  type RangeValue,
  isRangeValue,
  summariseFilters,
} from "@/lib/listings-api";
import { Toggle } from "./controls";
import { LucideIcon } from "./renderer";
import { cn } from "@/lib/utils";

/**
 * The filter rail for the listings picker.
 *
 * Which controls appear is decided by the server, not by this file — 4Sale's
 * own category pages offer storage capacity under mobiles and mileage under
 * cars — so everything here renders a `FilterField` generically and nothing
 * switches on a category name.
 *
 * Fields flagged `primary` stay open; the rest collapse behind "More filters",
 * which is the only thing keeping a rail of ten facets usable in the space a
 * results grid leaves over.
 */

const num = (n: number) => n.toLocaleString("en-US");

export function FilterRail({
  fields,
  values,
  lang,
  loading,
  onChange,
}: {
  fields: FilterField[];
  values: FilterValues;
  lang: Lang;
  loading: boolean;
  onChange: (next: FilterValues) => void;
}) {
  const [showMore, setShowMore] = useState(false);

  /** Undefined clears the key outright, so "no filter" and "empty selection"
   *  never diverge — an empty array would still serialise into the props. */
  const set = (id: string, value: FilterValue | undefined) => {
    const next = { ...values };
    if (value === undefined) delete next[id];
    else next[id] = value;
    onChange(next);
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 p-4 text-[11px] text-muted-foreground">
        <LucideIcon name="Loader" className="size-3 animate-spin" />
        Loading filters…
      </p>
    );
  }

  if (fields.length === 0) {
    return (
      <p className="p-4 text-[11px] leading-relaxed text-muted-foreground">
        Pick a category to see the filters available for it.
      </p>
    );
  }

  const primary = fields.filter((f) => f.primary);
  const secondary = fields.filter((f) => !f.primary);

  return (
    <div className="space-y-4 p-4">
      {primary.map((f) => (
        <FilterGroup key={f.id} field={f} value={values[f.id]} lang={lang} onChange={set} />
      ))}

      {secondary.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="flex w-full items-center gap-1.5 border-t border-border pt-3 text-xs font-medium text-brand transition hover:text-brand-strong"
          >
            <LucideIcon
              name="ChevronDown"
              className={cn("size-3.5 transition-transform", showMore && "rotate-180")}
            />
            {showMore ? "Fewer filters" : `More filters (${secondary.length})`}
          </button>

          {showMore &&
            secondary.map((f) => (
              <FilterGroup key={f.id} field={f} value={values[f.id]} lang={lang} onChange={set} />
            ))}
        </>
      )}
    </div>
  );
}

function FilterGroup({
  field,
  value,
  lang,
  onChange,
}: {
  field: FilterField;
  value: FilterValue | undefined;
  lang: Lang;
  onChange: (id: string, value: FilterValue | undefined) => void;
}) {
  if (field.kind === "toggle") {
    return (
      <Toggle
        checked={value === true}
        label={t(field.label, lang)}
        onChange={(v) => onChange(field.id, v ? true : undefined)}
      />
    );
  }

  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-foreground/70">
        {t(field.label, lang)}
      </span>
      {field.kind === "range" ? (
        <RangeField field={field} value={value} lang={lang} onChange={onChange} />
      ) : (
        <MultiField field={field} value={value} lang={lang} onChange={onChange} />
      )}
    </div>
  );
}

/** Long option lists (years, areas) scroll in place rather than pushing the
 *  fields below them off the rail. */
const SCROLL_AFTER = 8;

function MultiField({
  field,
  value,
  lang,
  onChange,
}: {
  field: FilterField & { kind: "multi" };
  value: FilterValue | undefined;
  lang: Lang;
  onChange: (id: string, value: FilterValue | undefined) => void;
}) {
  const selected = Array.isArray(value) ? value : [];

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    onChange(field.id, next.length > 0 ? next : undefined);
  };

  return (
    <div
      className={cn(
        "space-y-0.5",
        field.options.length > SCROLL_AFTER && "max-h-44 overflow-y-auto pe-1",
      )}
    >
      {field.options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => toggle(o.id)}
            className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-start text-xs transition hover:bg-neutral-surface"
          >
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded border transition",
                on ? "border-brand bg-brand text-brand-foreground" : "border-border",
              )}
            >
              {on && <LucideIcon name="Check" className="size-3" />}
            </span>
            <span className="truncate">{t(o.label, lang)}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Two sliders rather than a pair of number inputs: a half-typed number is
 * `NaN`, and every keystroke would fire a re-query against a nonsense bound.
 * Sliders can only ever produce a valid number in range.
 */
function RangeField({
  field,
  value,
  lang,
  onChange,
}: {
  field: FilterField & { kind: "range" };
  value: FilterValue | undefined;
  lang: Lang;
  onChange: (id: string, value: FilterValue | undefined) => void;
}) {
  const range: RangeValue = isRangeValue(value) ? value : { min: field.min, max: field.max };

  // A range spanning the whole band is not a filter — dropping it keeps it out
  // of the chip row and out of the published query.
  const commit = (next: RangeValue) =>
    onChange(field.id, next.min <= field.min && next.max >= field.max ? undefined : next);

  const row = (which: "min" | "max", label: string) => (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={range[which]}
        onChange={(e) => {
          const v = Number(e.target.value);
          // Dragging one handle past the other would invert the range; clamping
          // makes the two sliders behave like one control.
          commit(
            which === "min"
              ? { min: Math.min(v, range.max), max: range.max }
              : { min: range.min, max: Math.max(v, range.min) },
          );
        }}
        className="h-1.5 flex-1 accent-[var(--brand)]"
      />
    </div>
  );

  return (
    <div className="space-y-1.5">
      {row("min", "From")}
      {row("max", "To")}
      <p className="text-[11px] tabular-nums text-muted-foreground">
        {num(range.min)} – {num(range.max)} {t(field.unit, lang)}
      </p>
    </div>
  );
}

/**
 * Applied filters as removable chips.
 *
 * DAAD's rail has no equivalent, and with its groups collapsed there is no way
 * to tell what is currently narrowing the results. One chip per selected
 * option — not per field — so removing "Salmiya" does not also drop "Hawally".
 */
export function FilterChips({
  fields,
  values,
  lang,
  onChange,
}: {
  fields: FilterField[];
  values: FilterValues;
  lang: Lang;
  onChange: (next: FilterValues) => void;
}) {
  const chips = summariseFilters(fields, values);
  if (chips.length === 0) return null;

  const remove = (fieldId: string, optionId?: string) => {
    const next = { ...values };
    const current = next[fieldId];
    if (optionId && Array.isArray(current)) {
      const kept = current.filter((v) => v !== optionId);
      if (kept.length > 0) next[fieldId] = kept;
      else delete next[fieldId];
    } else {
      delete next[fieldId];
    }
    onChange(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => remove(c.field, c.option)}
          className="flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand transition hover:bg-brand hover:text-brand-foreground"
        >
          {t(c.label, lang)}
          <LucideIcon name="X" className="size-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange({})}
        className="rounded-full px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  );
}
