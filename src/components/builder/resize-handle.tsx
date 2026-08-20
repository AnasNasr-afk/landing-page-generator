import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Drag handle on the edge of a column or row split.
 *
 * Reports the total pixel delta from pointer-down (not per-move increments) so
 * the parent can resize from a snapshot and avoid drift.
 */
export function EdgeResizeHandle({
  axis,
  rtl,
  visible,
  label,
  onStart,
  onMove,
  onEnd,
}: {
  axis: "x" | "y";
  rtl?: boolean | undefined;
  visible?: boolean | undefined;
  label: string;
  onStart: (host: HTMLElement) => void;
  onMove: (deltaPx: number, spanPx: number) => void;
  onEnd?: (() => void) | undefined;
}) {
  const start = useRef<{ pos: number; span: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const verticalBar = axis === "x";

  return (
    <div
      role="separator"
      aria-orientation={verticalBar ? "vertical" : "horizontal"}
      aria-label={label}
      title={label}
      className={cn(
        "absolute z-30 touch-none",
        verticalBar
          ? "end-0 top-0 bottom-0 w-3 cursor-col-resize ltr:translate-x-1/2 rtl:-translate-x-1/2"
          : "inset-x-0 bottom-0 h-3 cursor-row-resize translate-y-1/2",
        // Hide column (width) handles when the canvas is in the phone frame —
        // columns stack, so a vertical divider would lie.
        verticalBar && "@max-[767px]:hidden",
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const target = e.currentTarget;
        const grid = target.closest("[data-fs-grid]") ?? target.parentElement;
        const box = grid?.getBoundingClientRect();
        const span = verticalBar ? (box?.width ?? 1) : (box?.height ?? 1);
        start.current = { pos: verticalBar ? e.clientX : e.clientY, span };
        setDragging(true);
        target.setPointerCapture(e.pointerId);
        onStart(target.parentElement ?? target);
      }}
      onPointerMove={(e) => {
        if (!start.current || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
        const now = verticalBar ? e.clientX : e.clientY;
        let delta = now - start.current.pos;
        if (verticalBar && rtl) delta = -delta;
        onMove(delta, start.current.span || 1);
      }}
      onPointerUp={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
        start.current = null;
        setDragging(false);
        onEnd?.();
      }}
      onDragStart={(e) => e.preventDefault()}
    >
      <span
        className={cn(
          "pointer-events-none block rounded-full bg-brand transition-opacity",
          verticalBar ? "mx-auto h-full w-0.5" : "mx-auto mt-1 h-1 w-12",
          visible || dragging ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      />
    </div>
  );
}

type BoxHandle = {
  id: string;
  /** When true, dragging toward the top of the screen grows the box (Chrome top edge). */
  invertY: boolean;
  cursor: string;
  className: string;
  corner?: boolean;
};

/**
 * Chrome-style resize frame: top + bottom edges and four corners.
 * Dragging inward shrinks, dragging outward grows. Positive `onMove` is always
 * "make taller" — each handle applies the correct sign.
 *
 * Width stays with the column grid; these grips only change height.
 */
const BOX_HANDLES: BoxHandle[] = [
  { id: "n", invertY: true, cursor: "cursor-ns-resize", className: "inset-x-3 -top-1 h-2" },
  { id: "s", invertY: false, cursor: "cursor-ns-resize", className: "inset-x-3 -bottom-1 h-2" },
  {
    id: "nw",
    invertY: true,
    cursor: "ltr:cursor-nwse-resize rtl:cursor-nesw-resize",
    className: "-top-1 -start-1",
    corner: true,
  },
  {
    id: "ne",
    invertY: true,
    cursor: "ltr:cursor-nesw-resize rtl:cursor-nwse-resize",
    className: "-top-1 -end-1",
    corner: true,
  },
  {
    id: "sw",
    invertY: false,
    cursor: "ltr:cursor-nesw-resize rtl:cursor-nwse-resize",
    className: "-bottom-1 -start-1",
    corner: true,
  },
  {
    id: "se",
    invertY: false,
    cursor: "ltr:cursor-nwse-resize rtl:cursor-nesw-resize",
    className: "-bottom-1 -end-1",
    corner: true,
  },
];

export function BoxResizeFrame({
  onStart,
  onMove,
  onEnd,
}: {
  onStart: (host: HTMLElement) => void;
  /** Positive = taller. Already signed for the handle that was grabbed. */
  onMove: (deltaHeight: number) => void;
  onEnd?: (() => void) | undefined;
}) {
  const start = useRef<{ y: number; invertY: boolean } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  return (
    <>
      {BOX_HANDLES.map((h) => (
        <div
          key={h.id}
          role="separator"
          aria-label="Resize"
          title="Drag inward to shrink, outward to grow"
          className={cn(
            "absolute z-30 touch-none",
            h.className,
            h.cursor,
            h.corner && "size-2.5",
          )}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const target = e.currentTarget;
            start.current = { y: e.clientY, invertY: h.invertY };
            setDragging(h.id);
            target.setPointerCapture(e.pointerId);
            onStart(target.parentElement ?? target);
          }}
          onPointerMove={(e) => {
            if (!start.current || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
            const raw = e.clientY - start.current.y;
            onMove(start.current.invertY ? -raw : raw);
          }}
          onPointerUp={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
            start.current = null;
            setDragging(null);
            onEnd?.();
          }}
          onDragStart={(e) => e.preventDefault()}
        >
          {h.corner ? (
            <span
              className={cn(
                "pointer-events-none block size-full rounded-[2px] border-2 border-brand bg-background shadow-panel",
                dragging && dragging !== h.id && "opacity-40",
              )}
            />
          ) : (
            <span
              className={cn(
                "pointer-events-none mx-auto mt-0.5 block h-1 w-10 rounded-full bg-brand/80",
                dragging && dragging !== h.id && "opacity-40",
              )}
            />
          )}
        </div>
      ))}
    </>
  );
}
