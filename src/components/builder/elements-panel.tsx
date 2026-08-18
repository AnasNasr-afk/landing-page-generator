import { useState } from "react";
import { cn } from "@/lib/utils";
import { ELEMENT_LIBRARY } from "@/lib/builder-content";
import {
  LAYOUT_LABEL,
  type ContainerLayout,
  type ElementType,
  type Template,
} from "@/lib/builder-types";
import { LucideIcon } from "./renderer";
import { BlockPreview } from "./block-preview";

const LAYOUTS: { key: ContainerLayout; cols: number[] }[] = [
  { key: "1", cols: [1] },
  { key: "50-50", cols: [1, 1] },
  { key: "35-65", cols: [35, 65] },
  { key: "65-35", cols: [65, 35] },
  { key: "3", cols: [1, 1, 1] },
];

type Tab = "elements" | "blocks";

/**
 * The left panel: everything you can put on the canvas.
 *
 * Blocks live here rather than in the Templates library because they are
 * dropped into the page you are looking at — the library is for starting a new
 * page, which is a different job.
 */
export function ElementsPanel({
  onAddContainer,
  onAddElement,
  canAddElement,
  targetLabel,
  blocks,
  blocksLoading,
  onDragElement,
  onDragBlock,
  onAddBlock,
  onDeleteBlock,
  onDragEnd,
}: {
  onAddContainer: (layout: ContainerLayout) => void;
  onAddElement: (type: ElementType) => void;
  canAddElement: boolean;
  targetLabel: string;
  /** Saved single-container templates. */
  blocks: Template[];
  blocksLoading: boolean;
  /** Starts a drag that inserts a new element wherever it is dropped. */
  onDragElement: (type: ElementType) => void;
  /** Starts a drag that inserts a whole container between two others. */
  onDragBlock: (templateId: string) => void;
  onAddBlock: (tpl: Template) => void;
  onDeleteBlock: (id: string) => void;
  onDragEnd: () => void;
}) {
  const [tab, setTab] = useState<Tab>("elements");

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="flex rounded-lg bg-neutral-surface p-1">
          {(
            [
              { key: "elements", label: "Elements" },
              { key: "blocks", label: `Blocks${blocks.length ? ` (${blocks.length})` : ""}` },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition",
                tab === t.key
                  ? "bg-background text-brand shadow-panel"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {tab === "blocks"
            ? "Sections you saved. Drag one between two containers."
            : canAddElement
              ? `Drag onto the canvas, or click to add to ${targetLabel}`
              : "Drag an element onto the canvas"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "blocks" ? (
          <BlocksTab
            blocks={blocks}
            loading={blocksLoading}
            onDragBlock={onDragBlock}
            onAddBlock={onAddBlock}
            onDeleteBlock={onDeleteBlock}
            onDragEnd={onDragEnd}
          />
        ) : (
          <>
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
                      <LucideIcon name={item.icon} className="size-4 text-brand" />
                      <span className="text-xs font-semibold leading-tight">{item.label}</span>
                      <span className="text-[10px] leading-tight text-muted-foreground">
                        {item.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function BlocksTab({
  blocks,
  loading,
  onDragBlock,
  onAddBlock,
  onDeleteBlock,
  onDragEnd,
}: {
  blocks: Template[];
  loading: boolean;
  onDragBlock: (templateId: string) => void;
  onAddBlock: (tpl: Template) => void;
  onDeleteBlock: (id: string) => void;
  onDragEnd: () => void;
}) {
  if (blocks.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 pb-16 text-center">
        <LucideIcon name="BookmarkPlus" className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">{loading ? "Loading blocks…" : "No saved blocks yet"}</p>
        {!loading && (
          <p className="text-xs text-muted-foreground">
            Select a container on the canvas, then use the bookmark button in its toolbar to save it
            here.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {blocks.map((tpl) => (
        <div
          key={tpl.id}
          draggable
          onDragStart={(e) => {
            // Firefox refuses to start a drag without payload.
            e.dataTransfer.setData("text/plain", tpl.id);
            e.dataTransfer.effectAllowed = "copy";
            onDragBlock(tpl.id);
          }}
          onDragEnd={onDragEnd}
          className="group cursor-grab overflow-hidden rounded-xl border border-border bg-background transition hover:border-brand hover:shadow-card active:cursor-grabbing"
        >
          {tpl.containers[0] && (
            <BlockPreview container={tpl.containers[0]} className="h-20 border-b border-border" />
          )}
          <div className="flex items-start gap-2 p-2.5">
            <button
              type="button"
              onClick={() => onAddBlock(tpl)}
              title="Add to the page"
              className="min-w-0 flex-1 text-start"
            >
              <span className="line-clamp-2 block text-xs font-semibold leading-tight">
                {tpl.name}
              </span>
              {tpl.description && (
                <span className="mt-1 line-clamp-2 block text-[10px] leading-tight text-muted-foreground">
                  {tpl.description}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onDeleteBlock(tpl.id)}
              title="Delete block"
              className="shrink-0 rounded-md border border-border p-1.5 text-muted-foreground opacity-0 transition hover:border-destructive hover:text-destructive group-hover:opacity-100"
            >
              <LucideIcon name="Trash2" className="size-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
