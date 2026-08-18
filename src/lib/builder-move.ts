import type {
  Container,
  ElementProps,
  ElementType,
  Lang,
  LText,
  PageElement,
} from "./builder-types";

/**
 * Pure page-tree moves, used by drag and drop.
 *
 * Kept out of the component so the index-arithmetic — which is the only part
 * that is easy to get wrong — is readable on its own.
 */

/** Where a drag is currently pointing: an insertion slot inside one column. */
export type DropSlot = {
  containerId: string;
  colIndex: number;
  /** Insertion index; equal to the column length means "append". */
  index: number;
};

/** What is being dragged: an existing element, or a new one from the library. */
export type DragPayload =
  | { kind: "move"; containerId: string; colIndex: number; elementId: string }
  | { kind: "new"; type: ElementType };

/** Removes an element, returning the new tree plus the element and its old index. */
export function takeElement(
  containers: Container[],
  from: { containerId: string; colIndex: number; elementId: string },
): { containers: Container[]; element: PageElement | undefined; index: number } {
  let element: PageElement | undefined;
  let index = -1;

  const next = containers.map((c) => {
    if (c.id !== from.containerId) return c;
    return {
      ...c,
      columns: c.columns.map((col, i) => {
        if (i !== from.colIndex) return col;
        const at = col.findIndex((e) => e.id === from.elementId);
        if (at < 0) return col;
        index = at;
        element = col[at];
        return col.filter((_, j) => j !== at);
      }),
    };
  });

  return { containers: next, element, index };
}

/** Inserts an element at a slot, clamping the index to the column's bounds. */
export function putElement(
  containers: Container[],
  at: DropSlot,
  element: PageElement,
): Container[] {
  return containers.map((c) => {
    if (c.id !== at.containerId) return c;
    return {
      ...c,
      columns: c.columns.map((col, i) => {
        if (i !== at.colIndex) return col;
        const index = Math.max(0, Math.min(at.index, col.length));
        return [...col.slice(0, index), element, ...col.slice(index)];
      }),
    };
  });
}

/**
 * Moves an existing element to a slot.
 *
 * The subtlety: within one column, removing the element first shifts every
 * later index down by one, so a slot below the original position has to be
 * decremented. Without this, dragging an element down by one does nothing.
 */
export function moveElement(containers: Container[], from: DragPayload, to: DropSlot): Container[] {
  if (from.kind !== "move") return containers;

  const taken = takeElement(containers, from);
  if (!taken.element) return containers;

  const sameColumn = from.containerId === to.containerId && from.colIndex === to.colIndex;
  const index = sameColumn && taken.index < to.index ? to.index - 1 : to.index;

  return putElement(taken.containers, { ...to, index }, taken.element);
}

/**
 * Writes one language's half of an `LText` living at a dotted path inside an
 * element's props — `"text"`, `"cta.label"`, `"items.2.body"`.
 *
 * Inline (double-click) editing on the canvas needs this because translatable
 * text is not always a top-level prop: cards, steps, FAQ entries and form fields
 * keep theirs inside arrays. The other language is preserved untouched.
 */
export function setLocalizedText(
  props: ElementProps,
  path: string,
  lang: Lang,
  value: string,
): ElementProps {
  const keys = path.split(".");
  const last = keys.pop();
  if (!last) return props;

  const next = JSON.parse(JSON.stringify(props)) as Record<string, unknown>;

  let node: Record<string, unknown> = next;
  for (const key of keys) {
    const child = node[key];
    if (child === null || typeof child !== "object") return props;
    node = child as Record<string, unknown>;
  }

  const current = node[last];
  const existing: LText =
    current !== null && typeof current === "object" ? (current as LText) : { en: "", ar: "" };
  node[last] = { ...existing, [lang]: value };

  return next as ElementProps;
}

/** True when a drop would leave the element exactly where it already is. */
export function isNoOpDrop(containers: Container[], from: DragPayload, to: DropSlot): boolean {
  if (from.kind !== "move") return false;
  if (from.containerId !== to.containerId || from.colIndex !== to.colIndex) return false;
  const container = containers.find((c) => c.id === from.containerId);
  const at = container?.columns[from.colIndex]?.findIndex((e) => e.id === from.elementId) ?? -1;
  return at === to.index || at + 1 === to.index;
}
