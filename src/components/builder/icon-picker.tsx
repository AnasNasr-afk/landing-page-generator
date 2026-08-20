import { useState } from "react";
import { cn } from "@/lib/utils";
import { ICON_CHOICES } from "@/lib/icon-name";
import { Icon } from "./renderer";
import { UiIcon } from "./ui-icon";

/**
 * Picks one of 4Sale's icons by looking at it.
 *
 * This replaced a bare text input that expected an icon's *name* typed from
 * memory — which meant an editor could not tell a valid name from a typo until
 * after the icon had already been placed on the page, and had no way to browse
 * what existed at all.
 *
 * The grid draws the real icons at the size they render on the page, through
 * the same `Icon` component the canvas uses, so what is previewed here is
 * literally what publishes. Names are kept as `title` tooltips rather than
 * labels: they are useful when hunting for a specific glyph and pure noise the
 * rest of the time.
 */
export function IconPicker({
  value,
  onChange,
  allowNone,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Offers a "no icon" tile — for surfaces where a bare label is valid. */
  allowNone?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const none = value === "none";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-2 text-xs transition-colors hover:bg-accent"
      >
        {none ? (
          <UiIcon name="Ban" className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <Icon name={value} className="size-4 shrink-0 text-brand" />
        )}
        <span className="flex-1 text-start text-muted-foreground">
          {none ? "No icon" : open ? "Pick an icon" : "Change icon"}
        </span>
        <UiIcon
          name="ChevronDown"
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          {/*
            A full-screen click target behind the grid closes it. Cheaper and
            more predictable than a document listener, which in a panel full of
            other popovers tends to race with the button's own click.
          */}
          <button
            type="button"
            aria-label="Close icon picker"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-background p-2 shadow-lift">
            <div className="grid grid-cols-6 gap-1">
              {/* "No icon" leads the grid rather than hiding at the end: on a
                  CTA it is the commonest choice, not an escape hatch. */}
              {allowNone && (
                <button
                  type="button"
                  title="No icon"
                  onClick={() => {
                    onChange("none");
                    setOpen(false);
                  }}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-lg transition-colors hover:bg-accent",
                    none ? "bg-brand-soft text-brand" : "text-muted-foreground",
                  )}
                >
                  <UiIcon name="Ban" className="size-4" />
                </button>
              )}
              {ICON_CHOICES.map((name) => (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-lg transition-colors hover:bg-accent",
                    name === value ? "bg-brand-soft text-brand" : "text-foreground",
                  )}
                >
                  <Icon name={name} className="size-4" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
