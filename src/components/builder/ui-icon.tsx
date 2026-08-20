import * as Icons from "lucide-react";

/**
 * An icon for the builder's own chrome — panels, toolbars, dialogs, pickers.
 *
 * Deliberately Lucide, and deliberately **not** the same component the canvas
 * uses. The two answer different questions:
 *
 * - `Icon` in `renderer.tsx` draws 4Sale's own icons, because whatever it
 *   renders ends up on a published landing page and has to look like 4Sale.
 * - This one dresses the tool. Nothing it draws reaches a visitor, so it is
 *   free to use Lucide's much larger set and pick whatever reads best for an
 *   editor — a drag handle, a spinner, a trash can.
 *
 * Keeping them separate is what stops tool chrome leaking into a page: if a
 * component only has `UiIcon`, it cannot accidentally publish a Lucide glyph.
 */
export function UiIcon({ name, className }: { name: string; className?: string | undefined }) {
  const registry = Icons as unknown as Record<
    string,
    React.ComponentType<{ className?: string | undefined }> | undefined
  >;
  const Cmp = registry[name] ?? Icons.Circle;
  return <Cmp className={className} />;
}
