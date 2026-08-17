import { cn } from "@/lib/utils";
import { ELEMENT_LIBRARY } from "@/lib/builder-content";
import { LAYOUT_LABEL, type ContainerLayout, type ElementType } from "@/lib/builder-types";
import { LucideIcon } from "./renderer";

const LAYOUTS: { key: ContainerLayout; cols: number[] }[] = [
  { key: "1", cols: [1] },
  { key: "50-50", cols: [1, 1] },
  { key: "35-65", cols: [35, 65] },
  { key: "65-35", cols: [65, 35] },
  { key: "3", cols: [1, 1, 1] },
];

export function ElementsPanel({
  onAddContainer,
  onAddElement,
  canAddElement,
  targetLabel,
}: {
  onAddContainer: (layout: ContainerLayout) => void;
  onAddElement: (type: ElementType) => void;
  canAddElement: boolean;
  targetLabel: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Elements</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {canAddElement ? `Adding into ${targetLabel}` : "Select a column to add elements"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-border px-4 py-4">
          <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Containers
          </h4>
          <div className="space-y-2">
            {LAYOUTS.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => onAddContainer(l.key)}
                className="group flex w-full items-center gap-3 rounded-xl border border-border bg-background p-2.5 text-start transition hover:border-brand hover:shadow-card"
              >
                <div className="flex h-8 w-16 gap-1 rounded-md bg-neutral-surface p-1">
                  {l.cols.map((c, i) => (
                    <div
                      key={i}
                      style={{ flexGrow: c }}
                      className="rounded-sm bg-brand/20 group-hover:bg-brand/40"
                    />
                  ))}
                </div>
                <span className="text-xs font-medium">{LAYOUT_LABEL[l.key]}</span>
              </button>
            ))}
          </div>
        </div>

        {ELEMENT_LIBRARY.map((group) => (
          <div key={group.group} className="border-b border-border px-4 py-4 last:border-0">
            <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.group}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {group.items.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  disabled={!canAddElement}
                  onClick={() => onAddElement(item.type)}
                  title={item.hint}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border border-border bg-background p-3 text-start transition",
                    canAddElement
                      ? "hover:border-brand hover:shadow-card"
                      : "cursor-not-allowed opacity-45",
                  )}
                >
                  <LucideIcon name={item.icon} className="size-4 text-brand" />
                  <span className="text-xs font-semibold leading-tight">{item.label}</span>
                  <span className="text-[10px] leading-tight text-muted-foreground">{item.hint}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
