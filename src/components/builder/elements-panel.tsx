import { useState } from "react";
import { cn } from "@/lib/utils";
import { ELEMENT_LIBRARY } from "@/lib/builder-content";
import {
  LAYOUT_SPLIT,
  layoutLabel,
  type ContainerDirection,
  type ContainerLayout,
  type ElementType,
} from "@/lib/builder-types";
import { UiIcon as Icon } from "./ui-icon";

const LAYOUTS: ContainerLayout[] = ["1", "50-50", "35-65", "65-35", "3"];

export function ElementsPanel({
  onAddContainer,
  onAddElement,
  canAddElement,
  targetLabel,
  onDragElement,
  onDragEnd,
}: {
  onAddContainer: (layout: ContainerLayout, direction: ContainerDirection) => void;
  onAddElement: (type: ElementType) => void;
  canAddElement: boolean;
  targetLabel: string;
  /** Starts a drag that inserts a new element wherever it is dropped. */
  onDragElement: (type: ElementType) => void;
  onDragEnd: () => void;
}) {
  const [direction, setDirection] = useState<ContainerDirection>("horizontal");

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Elements</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {canAddElement
            ? `Drag onto the canvas, or click to add to ${targetLabel}`
            : "Drag an element onto the canvas"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-border px-4 py-4">
          <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Containers
          </h4>
          <div className="flex rounded-full bg-neutral-surface p-[3px]">
            {(["horizontal", "vertical"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={cn(
                  "flex-1 rounded-full py-1.5 text-[13px] font-medium capitalize transition",
                  direction === d
                    ? "bg-background text-brand shadow-panel"
                    : "text-muted-foreground",
                )}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="mt-2.5 flex flex-col gap-2">
            {LAYOUTS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onAddContainer(key, direction)}
                className="flex w-full items-center gap-3 rounded-[10px] border border-border bg-background px-3 py-2.5 text-start transition hover:border-brand/40"
              >
                <LayoutThumb layout={key} vertical={direction === "vertical"} />
                <span className="text-[13px] font-medium leading-none text-foreground">
                  {layoutLabel(key, direction)}
                </span>
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
                  draggable
                  onDragStart={(e) => {
                    // Firefox refuses to start a drag without payload.
                    e.dataTransfer.setData("text/plain", item.type);
                    e.dataTransfer.effectAllowed = "copy";
                    onDragElement(item.type);
                  }}
                  onDragEnd={onDragEnd}
                  onClick={() => onAddElement(item.type)}
                  title={item.hint}
                  className={cn(
                    "flex cursor-grab flex-col items-start gap-2 rounded-xl border border-border bg-background p-3 text-start transition",
                    "hover:border-brand hover:shadow-card active:cursor-grabbing",
                    !canAddElement && "opacity-80",
                  )}
                >
                  <Icon name={item.icon} className="size-4 text-brand" />
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

/**
 * Thumbnail for a container split. Frame size is fixed so every card lines up;
 * only the bars inside change with the layout.
 */
function LayoutThumb({
  layout,
  vertical,
}: {
  layout: ContainerLayout;
  vertical: boolean;
}) {
  return (
    <div
      className={cn(
        "shrink-0 rounded-md bg-neutral-surface p-[3px]",
        vertical ? "flex h-10 w-10 flex-col gap-[3px]" : "flex h-[30px] w-16 gap-[3px]",
      )}
    >
      {LAYOUT_SPLIT[layout].map((weight, i) => (
        <div
          key={i}
          style={{ flexGrow: weight, flexBasis: 0 }}
          className="min-h-0 min-w-0 rounded-[3px] bg-brand/25"
        />
      ))}
    </div>
  );
}
