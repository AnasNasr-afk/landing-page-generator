import { cn } from "@/lib/utils";
import type { Container, ContainerLayout, PageElement } from "@/lib/builder-types";
import { IMAGE_MAP } from "@/lib/builder-content";
import {
  TONE_COLOR,
  backgroundStyle,
  hasCustomBg,
  overlayStyle,
  resolveTone,
} from "@/lib/container-bg";

/**
 * A miniature wireframe of one container.
 *
 * A third reader of the container tree, after `renderer.tsx` (the canvas) and
 * `serialize.ts` (the published HTML) — but a deliberately lossy one: it draws
 * the *shape* of a block so it is recognisable at thumbnail size, where real
 * text would be an unreadable smudge. Columns keep their real widths and the
 * container keeps its real background, so a hero with copy on the left and a
 * picture on the right looks like one in the list.
 */

/** Column widths per layout, mirroring the grid tracks in `renderer.tsx`. */
const COLUMN_WEIGHTS: Record<ContainerLayout, number[]> = {
  "1": [1],
  "50-50": [1, 1],
  "35-65": [35, 65],
  "65-35": [65, 35],
  "3": [1, 1, 1],
};

/** Preset surfaces, mirroring `BG` in `renderer.tsx` so tone comes along. */
const SURFACE: Record<Container["background"], string> = {
  white: "bg-background text-foreground",
  soft: "bg-brand-soft text-foreground",
  brand: "bg-brand text-brand-foreground",
  gray: "bg-neutral-surface text-foreground",
};

export function BlockPreview({
  container,
  className,
}: {
  container: Container;
  className?: string | undefined;
}) {
  const custom = hasCustomBg(container);
  const scrim = overlayStyle(container);
  const onDark = custom ? resolveTone(container) === "light" : container.background === "brand";

  // Shapes are drawn in `currentColor` so they invert automatically on a dark
  // background; only the accent has to be chosen explicitly.
  const accent = onDark ? "bg-current opacity-90" : "bg-brand";
  const weights = COLUMN_WEIGHTS[container.layout];

  return (
    <div
      className={cn(
        "relative flex gap-1.5 overflow-hidden p-2",
        !custom && SURFACE[container.background],
        className,
      )}
      style={
        custom
          ? { ...backgroundStyle(container), color: TONE_COLOR[resolveTone(container)] }
          : undefined
      }
    >
      {scrim ? <div style={scrim} /> : null}
      {container.columns.map((col, i) => (
        <div
          key={i}
          // `flexBasis: 0` makes the weights behave like grid fractions rather
          // than being skewed by each column's content.
          style={{ flexGrow: weights[i] ?? 1, flexBasis: 0, position: "relative" }}
          className="flex min-w-0 flex-col justify-center gap-1.5"
        >
          {col.slice(0, 4).map((el) => (
            <ElementShape key={el.id} el={el} accent={accent} />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * One element as a shape.
 *
 * Unlike the renderer and the serializer this has no `never` guard: a new
 * element type should show up as a generic bar rather than break the build,
 * because a wrong thumbnail is not a wrong page.
 */
function ElementShape({ el, accent }: { el: PageElement; accent: string }) {
  const line = "rounded-full bg-current";
  const box = "rounded-sm bg-current opacity-15";

  switch (el.type) {
    case "heading": {
      const level = el.props["level"];
      const height = level === "h1" ? "h-2" : level === "h3" ? "h-1" : "h-1.5";
      return <div className={cn(line, height, "w-4/5 opacity-70")} />;
    }

    case "text":
      return (
        <div className="space-y-1">
          <div className={cn(line, "h-1 w-full opacity-30")} />
          <div className={cn(line, "h-1 w-11/12 opacity-30")} />
          <div className={cn(line, "h-1 w-3/5 opacity-30")} />
        </div>
      );

    case "image":
    case "video": {
      const src = typeof el.props["src"] === "string" ? (el.props["src"] as string) : "";
      const resolved = IMAGE_MAP[src] || src;
      // The real picture, when there is one — nothing reads as "image here"
      // faster than the image itself.
      return resolved ? (
        <div
          className="h-10 w-full rounded-sm bg-cover bg-center"
          style={{ backgroundImage: `url("${resolved.replace(/"/g, '\\"')}")` }}
        />
      ) : (
        <div className={cn(box, "h-10 w-full opacity-25")} />
      );
    }

    case "cta":
      return <div className={cn("h-2.5 w-14 rounded-full", accent)} />;

    case "ctaSection":
      return (
        <div className="flex flex-col items-center gap-1 py-0.5">
          <div className={cn(line, "h-1.5 w-2/3 opacity-70")} />
          <div className={cn("h-2 w-10 rounded-full", accent)} />
        </div>
      );

    case "cards":
    case "steps":
      return (
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn(box, "h-7 flex-1")} />
          ))}
        </div>
      );

    case "icons":
      return (
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn("size-3 rounded-sm", accent, "opacity-50")} />
          ))}
        </div>
      );

    case "form":
      return (
        <div className="space-y-1">
          <div className={cn(box, "h-2.5 w-full")} />
          <div className={cn(box, "h-2.5 w-full")} />
          <div className={cn("h-2.5 w-10 rounded-full", accent)} />
        </div>
      );

    case "listings":
      return (
        <div className="grid grid-cols-4 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cn(box, "h-6")} />
          ))}
        </div>
      );

    case "faq":
      return (
        <div className="space-y-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn(box, "h-2 w-full")} />
          ))}
        </div>
      );

    case "divider":
      return <div className="h-px w-full bg-current opacity-25" />;

    case "spacer":
      return <div className="h-2" />;

    default:
      return <div className={cn(line, "h-1.5 w-2/3 opacity-30")} />;
  }
}
