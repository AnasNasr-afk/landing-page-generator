# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
bun install          # bun.lock + bunfig.toml are committed; npm also works (README documents `npm i`)
bun run dev          # vite dev — TanStack Start dev server
bun run build        # vite build (nitro, cloudflare target by default)
bun run build:dev    # build in development mode
bun run preview      # serve the production build
bun run lint         # eslint . (prettier runs as an eslint rule, so lint fails on formatting)
bun run format       # prettier --write .
```

`bun.lock` is committed but **bun is not installed on this machine** — use `npm`. The
dev server comes up on **port 8080**, not 5173.

There is no test runner and no typecheck script. For type errors run `npx tsc --noEmit` — tsconfig is strict and includes `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`, so optional props must be written as `foo?: T | undefined` and indexed access needs `?? fallback` or `!`.

`npm run lint` **fails repo-wide for a pre-existing reason**: every tracked file uses
CRLF while prettier expects LF, so `eslint` reports a `Delete ␍` error on nearly every
line of untouched files like `renderer.tsx`. Don't "fix" this by reformatting — it would
rewrite every file and churn the Lovable sync. Lint the specific paths you touched
(`npx eslint src/lib/publish`) and ignore the `␍` noise in files you didn't create.

`bunfig.toml` sets `minimumReleaseAge = 86400`: packages published in the last 24h are skipped on install. Confirm with the user before adding anything to `minimumReleaseAgeExcludes`.

## What this is

A **prototype** of a self-service landing page builder for the 4Sale (q84sale.com) marketing/SEO team — a "lightweight custom 4Sale Webflow", explicitly not a blog CMS or a Figma-style free-positioning canvas. Everything is client-side and mocked: there is no backend, no persistence, and no real listings API. "Save draft", "Publish", and form submits are toasts and local state changes.

`README.md` is the full product spec (brand rules, element list, CTA semantics, SEO panel scope, what must stay marked "pending SEO validation"). Read it before changing product behavior — several deliberate constraints live only there, e.g. do **not** introduce absolute X/Y positioning, and do **not** present `?lang=ar` / `?lang=en` as a settled URL architecture.

## Architecture

The entire app is one route. `src/routes/index.tsx` holds *all* builder state in `useState` and passes it down; the panels and renderer are pure presentational components. There is no store, no context, no reducer.

- **`src/lib/builder-types.ts`** — the data model and its invariants. A `LandingPage` owns `SeoSettings` plus an ordered `Container[]`; each `Container` has a `layout` (`"1" | "50-50" | "35-65" | "65-35" | "3"`) and `columns: PageElement[][]`, where a `PageElement` is `{ id, type, props }` with **untyped `props: Record<string, unknown>`**. Helpers here matter: `COLUMN_COUNT` maps layout → column count, `uid()` mints ids, and `reId()` deep-clones containers with fresh ids — used whenever a template is instantiated or a container duplicated, so copies never share ids with the original.
- **`src/lib/builder-content.ts`** — all seed/mock data plus `ELEMENT_LIBRARY` (the left-panel groups) and `defaultProps(type)`. `seedPage` / `seedTemplates` are functions passed directly as lazy `useState` initializers. Images are referenced by sentinel keys (`"__hero__"`, `"__app__"`) resolved through `IMAGE_MAP` at render time so container trees stay JSON-serializable.
- **`src/components/builder/renderer.tsx`** — the single rendering path for page content. `ElementView` switches on `el.type`; `ContainerView` applies background/width/layout classes and takes a `children(colIndex)` render prop. The canvas in `index.tsx` and the `PageRenderer` used by Preview both go through these, which is why the preview looks identical minus the editor chrome (`ElementView` takes an `editing` flag for editor-only hints like the listings "API-dependent" banner).
- **`src/components/builder/properties-panel.tsx`** — the mirror of the renderer: an `ElementEditor` switch over the same `el.type` values writing into `props`.
- **`src/components/builder/controls.tsx`** — the panel input primitives (`Section`, `Field`, `TextInput`, `SelectInput`, `Segmented`, `SliderInput`, `Toggle`, `Pill`). Builder-chrome UI uses these and hand-written Tailwind, not `src/components/ui/*`.

### Adding an element type

Four coordinated edits, all keyed off the same `ElementType` literal: add it to `ElementType` in `builder-types.ts`; add a `defaultProps` case and an `ELEMENT_LIBRARY` entry in `builder-content.ts`; add an `ElementView` case in `renderer.tsx`; add an `ElementEditor` case in `properties-panel.tsx`. `noFallthroughCasesInSwitch` is on, so every case needs its own `return`.

### Bilingual content (EN/AR)

Every user-facing string in page data is an `LText` (`{ en, ar }`) read through `t(value, lang)` — never a bare string. AR/EN is a view toggle over one page entity, not two pages. Layout direction is driven by `dir={lang === "ar" ? "rtl" : "ltr"}` on the canvas/preview wrappers, so **use logical Tailwind utilities** (`ms-*`/`me-*`, `ps-*`/`pe-*`, `start-*`/`end-*`, `text-start`/`text-end`, `border-s`/`border-e`) rather than left/right ones, and `rtl:rotate-180` on directional icons.

### CTAs

A CTA is tracking metadata, not just a button: `{ label, action, destination, event, variant }` where `action` is `internal | external | scroll | app | search`. Clicking one calls `fireCta` in `index.tsx`, which toasts the tracking event instead of navigating. Keep new CTA surfaces going through `Cta`/`CtaButton`.

## Canvas responsiveness — use container queries, not `md:`

The canvas and preview simulate a phone by narrowing their wrapper, so **breakpoints
inside `renderer.tsx` must be container queries** (`@min-[768px]:`), never viewport ones
(`md:`, `sm:`, `lg:`). A `md:` utility keys off the browser window, which stays
desktop-width, so the device toggle would visibly do nothing to the layout.

`@container` sits on the canvas wrapper and the preview wrapper in `index.tsx`; any
`@min-[...]` utility needs one of those ancestors. Pixel values match the media queries
in `src/lib/publish/styles.ts` (640 / 768 / 1024) so the canvas breaks where the real
page does. The published stylesheet keeps **media** queries — correct there, since it
renders in a real viewport.

## Canvas editing

Two direct-manipulation paths sit alongside the right-hand properties panel:

- **Drag & drop** (native HTML5, no dnd library — `package.json` syncs to Lovable and
  `bunfig.toml` guards new packages). Reorder within a column, move across
  columns/containers, and drag from the elements library to insert *at a position*.
  The tree operations live in `src/lib/builder-move.ts`; the index arithmetic there is
  the subtle part (removing an element shifts later indices down by one, so a target
  slot below the source must be decremented — otherwise dragging down by one is a
  no-op). Containers still reorder via the panel arrows.

  There are **two kinds of drop target**, and they must not both react to one drag: a
  `DropSlot` is a position inside a column and takes elements, a `ContainerSlot` is the
  gap between two containers and takes saved blocks. Column handlers therefore test
  `elementDrag` rather than `drag`, and the gaps only respond to `kind === "block"`.
  The gaps are zero-height with an absolutely positioned hit area, so switching targets
  on at the start of a drag does not shift the canvas under the pointer.
- **Double-click to edit text** in place, via `contentEditable` in `renderer.tsx`
  (`useInlineEdit`). Enter commits (Shift+Enter for multiline fields), Escape reverts,
  blur commits. Reads `innerText` so paragraph line breaks survive.
  `setLocalizedText` writes one language's half of the `LText` at a dotted prop path
  (`"text"`, `"cta.label"`, `"items.2.body"`) — needed because translatable text also
  lives inside arrays (cards, steps, FAQ, form fields).

**Which node is being edited is owned by `index.tsx`, not by each `ElementView`.** Held
locally it was possible to leave several nodes `contentEditable` at once when a blur
never fired; a single lifted value makes that unreachable. Dragging is disabled on the
element being edited, since a draggable ancestor hijacks text selection.

## Templates (`src/lib/template-api.ts` + the backend)

A template stores the **`Container[]` source tree**, not published HTML: it exists to be
reopened and edited, so it keeps the input to `renderer.tsx`, not the output of
`serialize.ts`. Two kinds, both on the same collection:

- **`page`** — every container, replaces the canvas and starts a new landing page.
- **`block`** — exactly one container, inserted into the page already open, below the
  selected container or at the end. The backend rejects a `block` with more than one.

Everything goes through `reId` on the way **in and out**, so a saved template shares no
ids with the page it came from and an inserted copy shares none with the template. Both
directions were observed: editing an inserted block must not write back into the library.

The seeded templates in `builder-content.ts` stay local and are marked `system` — they
ship with the builder, are not stored in Mongo, and cannot be deleted. `fetchTemplates`
is prepended to them on mount, which is why the load effect filters state down to
`system` before merging rather than replacing it.

**The two kinds live in different places, on purpose.** Page templates are the Templates
screen; blocks are a tab in the left panel beside Elements, and are the only place blocks
appear — they are dropped into the page you are looking at, so choosing one on a screen
where the canvas is not visible meant picking blind. `TemplatesScreen` therefore receives
`pageTemplates`, never the whole library.

Each block card carries a **`BlockPreview`** (`src/components/builder/block-preview.tsx`):
a miniature wireframe of the container, drawn from the same tree. It is a third reader of
`Container[]` after `renderer.tsx` and `serialize.ts`, but deliberately lossy — real text
is an unreadable smudge at 80px tall, so it draws element *shapes* instead, keeps the real
column widths and background, and drops in the real image when there is one. Shapes are
`bg-current` so they invert by themselves on a dark container, and unlike the other two
readers its `switch` has **no `never` guard**: a new element type should fall through to a
generic bar rather than break the build, because a wrong thumbnail is not a wrong page.

Page-template cards use the same component on their **opening container only** — the rest
of the page is not drawn. Every template starts with a hero, so the card leans on its name
and description to tell them apart; if that stops being enough, stacking a preview per
container is the change to make.

Whichever path adds a block — dragging it in, or clicking it in the panel — `insertBlock`
selects the new container, scrolls it into view and outlines it for a moment, so an insert
is never a silent change somewhere off screen. Blocks are also deleted from that tab,
since they no longer appear in the library screen.

That scroll goes through a **ref map keyed by container id, not a `data-` attribute**:
`uid()` is random, so an id rendered into the markup differs between the SSR pass and the
client one and React reports a hydration mismatch.

SEO settings deliberately do not travel with a template: a copied slug would collide with
the page it came from.

## Publishing (`src/lib/publish/`)

`Publish` converts the page tree into an **HTML fragment + SEO JSON** and POSTs it to
`mock-backend` (see `docs/integration-nextjs.md` for the contract and the Next.js route
that consumes it). React never produces an HTML string, so this is a second, independent
reader of the same `Container[]` tree that `renderer.tsx` reads — `renderer.tsx` draws
the canvas, `serialize.ts` writes text.

- **`serialize.ts`** — the tree → HTML. Its `switch` is typed against `ElementType` with
  a `never` guard in `default`, so adding an element without handling it here is a
  compile error rather than a blank section in a published page. Keep it in step with
  `renderer.tsx`.
- **`styles.ts`** — one CSS string. **The specificity layering is load-bearing**: the
  reset is written `.fs-lp :where(…)` (0-1-0) so it sits above the host site's element
  rules (`h1 {}` = 0-0-1) but below our own utility classes, which tie at 0-1-0 and win
  on source order. Writing it `.fs-lp h1` zeroes every utility margin; writing it
  `:where(.fs-lp) :where(h1)` lets the host repaint our headings. Both were observed and
  fixed — don't "simplify" those selectors. Also: **no backticks in the CSS**, it's a
  template literal (this broke the app twice).
- **`payload.ts`** — renders once per language in `page.languages`, attaches the CSS and
  `SeoSettings`, POSTs to `PUBLISH_API`. `standaloneDocument()` wraps a locale in a full
  document for the Download button only.
- **`icon.ts`** — Lucide icons inlined as SVG via `renderToStaticMarkup`, because the
  published page has no React and the icon fields are free text (any Lucide name).

Two invariants for anything emitted: **no `<script>`** (the host injects via
`dangerouslySetInnerHTML`, where scripts never execute — interactivity is CSS-only or
delegated through `data-fs-*`), and **all author text through `esc()`**.

The `HTML` button in the top bar builds the payload locally and opens the output panel,
so generated HTML is inspectable with the backend down.

### mock-backend

Zero-dependency Node server, no auth, JSON-file persistence. `cd mock-backend && node
server.js` (port 4000). `GET /p/:slug?lang=ar` renders a published page as a full
standalone document — the fastest way to eyeball export output.

## Styling

Tailwind v4, configured entirely in `src/styles.css` — there is no `tailwind.config`. Colors **must** be `oklch`. To add a semantic color, define it in `:root` (and `.dark`) and register it in `@theme inline` as `--color-<name>`. 4Sale brand tokens already exist: `brand`, `brand-strong`, `brand-soft`, `brand-foreground`, `neutral-surface`, plus `shadow-card` / `shadow-lift` / `shadow-brand` / `shadow-panel`. Use these — no purple/gradient SaaS look.

`src/components/ui/*` is stock shadcn/ui (new-york, lucide icons) via `components.json`; most of it is unused by the builder. Icons are resolved by string name through the `LucideIcon` wrapper in `renderer.tsx` so icon choices can live in serializable data.

## Framework conventions

TanStack Start + TanStack Router file-based routing. `src/routes/README.md` documents the conventions; `src/routeTree.gen.ts` is generated — don't edit it. Do not create `src/pages/` or `app/layout.tsx` (Next.js/Remix conventions), and don't add plugins already provided by `@lovable.dev/vite-tanstack-config` (React, tailwind, tsconfig paths, tanstackStart, nitro, devtools) — duplicates break the build.

`src/server.ts` (the SSR entry, wired via `vite.config.ts`) and `src/start.ts` are Lovable-provided error-handling and CSRF scaffolding, not app code. `src/start.ts` re-adds the CSRF middleware that Start would install automatically if the file didn't exist — keep it.

## Lovable sync

Per `AGENTS.md`: this repo is connected to Lovable, and pushes to `main` sync back into the Lovable editor. Never force-push or rewrite pushed history (no rebase/amend/squash of pushed commits) — it destroys the user's Lovable project history. Keep `main` in a working state.
