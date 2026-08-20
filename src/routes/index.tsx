import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import {
  COLUMN_COUNT,
  type Container,
  type ContainerDirection,
  type ContainerLayout,
  type Cta,
  type ElementType,
  type Lang,
  type LandingPage,
  type Template,
  type TemplateKind,
  containerDirection,
  containerTracks,
  defaultTracks,
  nudgeTracks,
  reId,
  t,
  uid,
} from "@/lib/builder-types";
import { newContainer, newElement, seedPage, seedTemplates } from "@/lib/builder-content";
import {
  createTemplate,
  deleteTemplate as deleteTemplateRequest,
  fetchTemplates,
} from "@/lib/template-api";
import {
  type ContainerSlot,
  type DragPayload,
  type DropSlot,
  insertContainers,
  isNoOpDrop,
  moveElement as moveElementTo,
  putElement,
  setLocalizedText,
} from "@/lib/builder-move";
import { ContainerView, ElementView, PageRenderer } from "@/components/builder/renderer";
import { UiIcon as Icon } from "@/components/builder/ui-icon";
import { ElementsPanel } from "@/components/builder/elements-panel";
import { PropertiesPanel } from "@/components/builder/properties-panel";
import { PageSettingsPanel, SeoPanel } from "@/components/builder/seo-panel";
import {
  AssetsScreen,
  SaveTemplateDialog,
  TemplatesScreen,
} from "@/components/builder/templates-screen";
import { PagesScreen } from "@/components/builder/pages-screen";
import { PublishPanel } from "@/components/builder/publish-panel";
import { EdgeResizeHandle, BoxResizeFrame } from "@/components/builder/resize-handle";
import {
  deletePage as deletePageRequest,
  fetchPageForEditing,
  fetchPages,
  type PageSummary,
} from "@/lib/page-api";
import {
  type PublishPayload,
  buildPayload,
  publishPage,
  publishedUrl,
} from "@/lib/publish/payload";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "landing-page-generator" },
      {
        name: "description",
        content:
          "Self-service 4Sale landing page builder: containers, CTAs, lead forms, marketplace listings, reusable templates and an SEO & AI search panel.",
      },
      { property: "og:title", content: "landing-page-generator" },
      {
        property: "og:description",
        content:
          "Build, preview and publish branded 4Sale landing pages without a designer or developer.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: BuilderApp,
});

type Nav = "build" | "pages" | "templates" | "seo" | "assets";
type Selection = { containerId: string; colIndex: number | null; elementId: string | null } | null;

const NAV: { key: Nav; icon: string; label: string }[] = [
  { key: "build", icon: "LayoutPanelTop", label: "Build" },
  { key: "pages", icon: "Files", label: "Pages" },
  { key: "templates", icon: "LayoutTemplate", label: "Templates" },
  { key: "seo", icon: "Search", label: "SEO" },
  { key: "assets", icon: "Images", label: "Assets" },
];

/** Visual scale of the artboard. Independent of Desktop/Mobile width. */
const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;

const clampZoom = (n: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(n / 5) * 5));

function BuilderApp() {
  const [page, setPage] = useState<LandingPage>(seedPage);
  const [templates, setTemplates] = useState<Template[]>(seedTemplates);
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [nav, setNav] = useState<Nav>("build");
  const [lang, setLang] = useState<Lang>("en");
  const [sel, setSel] = useState<Selection>(null);
  const [preview, setPreview] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [zoom, setZoom] = useState(100);
  const canvasRef = useRef<HTMLDivElement>(null);
  const trackDrag = useRef<{ id: string; tracks: number[] } | null>(null);
  const heightDrag = useRef<number>(0);
  /** What the save dialog is capturing, or null when it is closed. */
  const [saveTpl, setSaveTpl] = useState<{
    kind: TemplateKind;
    containerId?: string;
    containerName?: string;
  } | null>(null);
  const [savingTpl, setSavingTpl] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [openingPage, setOpeningPage] = useState<string | null>(null);
  const [deletingPage, setDeletingPage] = useState<string | null>(null);
  const [output, setOutput] = useState<{
    payload: PublishPayload;
    published: boolean;
  } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [dropSlot, setDropSlot] = useState<DropSlot | null>(null);
  /** Where a dragged block would land: an insertion index between containers. */
  const [containerSlot, setContainerSlot] = useState<ContainerSlot | null>(null);
  /**
   * A container to scroll to and outline briefly after it is inserted, so a
   * block added from a click rather than a drop is not a silent change
   * somewhere off screen.
   */
  const [flash, setFlash] = useState<string | null>(null);
  /**
   * Canvas nodes by container id, for scrolling to one.
   *
   * A ref map rather than a `data-` attribute because `uid()` is random: an id
   * rendered into the markup differs between the server pass and the client
   * one, which React reports as a hydration mismatch.
   */
  const containerNodes = useRef(new Map<string, HTMLDivElement>());
  /**
   * The single text node being edited in place, canvas-wide. Owned here rather
   * than inside each element so only one node can ever be contentEditable.
   */
  const [inlineEdit, setInlineEdit] = useState<{ elementId: string; path: string } | null>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setZoom((z) => clampZoom(z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [nav, preview]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setZoom((z) => clampZoom(z + ZOOM_STEP));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((z) => clampZoom(z - ZOOM_STEP));
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(100);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /**
   * Saved templates live in the backend; the seeded ones ship with the builder
   * and stay local, which is why they are kept and the fetched list is only
   * prepended rather than replacing state.
   */
  useEffect(() => {
    let cancelled = false;

    fetchTemplates()
      .then((saved) => {
        if (!cancelled) setTemplates((ts) => [...saved, ...ts.filter((x) => x.system)]);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast.error("Couldn't load saved templates", {
          description:
            error instanceof Error ? error.message : "The publishing API is unreachable.",
        });
      })
      .finally(() => {
        if (!cancelled) setTemplatesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchPages()
      .then((saved) => {
        if (!cancelled) setPages(saved);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast.error("Couldn't load published pages", {
          description:
            error instanceof Error ? error.message : "The publishing API is unreachable.",
        });
      })
      .finally(() => {
        if (!cancelled) setPagesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Brings a freshly inserted container into view and clears the outline.
   *
   * Runs after paint so the node exists; the timeout length only has to
   * outlast the CSS transition on the ring.
   */
  useEffect(() => {
    if (!flash) return;

    containerNodes.current.get(flash)?.scrollIntoView({ behavior: "smooth", block: "center" });

    const timer = window.setTimeout(() => setFlash(null), 1600);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const container = useMemo(
    () => page.containers.find((c) => c.id === sel?.containerId),
    [page.containers, sel],
  );
  const element = useMemo(() => {
    if (!container || sel?.colIndex == null || !sel.elementId) return undefined;
    return container.columns[sel.colIndex]?.find((e) => e.id === sel.elementId);
  }, [container, sel]);

  const blocks = useMemo(() => templates.filter((x) => x.kind === "block"), [templates]);
  const pageTemplates = useMemo(() => templates.filter((x) => x.kind !== "block"), [templates]);

  const setContainers = (fn: (cs: Container[]) => Container[]) =>
    setPage((p) => ({ ...p, containers: fn(p.containers), status: "draft" }));

  const updateContainer = (patch: Partial<Container>) => {
    if (!sel?.containerId) return;
    patchContainer(sel.containerId, patch);
  };

  const patchContainer = (id: string, patch: Partial<Container>) =>
    setContainers((cs) =>
      cs.map((c) => {
        if (c.id !== id) return c;
        let columns = c.columns;
        let tracks = patch.tracks ?? c.tracks;
        if (patch.layout && patch.layout !== c.layout) {
          const target = COLUMN_COUNT[patch.layout];
          columns = Array.from({ length: target }, (_, i) => c.columns[i] ?? []);
          if (c.columns.length > target) {
            const overflow = c.columns.slice(target).flat();
            columns = columns.map((col, i) => (i === target - 1 ? [...col, ...overflow] : col));
          }
          tracks = defaultTracks(patch.layout);
        }
        return { ...c, ...patch, columns, tracks };
      }),
    );

  const updateElement = (patch: Record<string, unknown>) =>
    setContainers((cs) =>
      cs.map((c) =>
        c.id !== sel?.containerId
          ? c
          : {
              ...c,
              columns: c.columns.map((col, i) =>
                i !== sel?.colIndex
                  ? col
                  : col.map((e) =>
                      e.id === sel.elementId ? { ...e, props: { ...e.props, ...patch } } : e,
                    ),
              ),
            },
      ),
    );

  const addContainer = (layout: ContainerLayout, direction: ContainerDirection = "horizontal") => {
    const c = newContainer(layout, COLUMN_COUNT[layout], direction);
    setContainers((cs) => {
      const at = cs.findIndex((x) => x.id === sel?.containerId);
      if (at === -1) return [...cs, c];
      const next = [...cs];
      next.splice(at + 1, 0, c);
      return next;
    });
    setSel({ containerId: c.id, colIndex: 0, elementId: null });
    toast.success("Container added");
  };

  const addElement = (type: ElementType) => {
    if (!sel || sel.colIndex == null) {
      toast("Pick a column first", { description: "Or drag the element onto the canvas." });
      return;
    }
    const el = newElement(type);
    setContainers((cs) =>
      cs.map((c) =>
        c.id !== sel.containerId
          ? c
          : { ...c, columns: c.columns.map((col, i) => (i === sel.colIndex ? [...col, el] : col)) },
      ),
    );
    setSel({ ...sel, elementId: el.id });
  };

  const moveContainer = (dir: -1 | 1) =>
    setContainers((cs) => {
      const i = cs.findIndex((c) => c.id === sel?.containerId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= cs.length) return cs;
      const next = [...cs];
      const [x] = next.splice(i, 1);
      next.splice(j, 0, x as Container);
      return next;
    });

  const duplicateContainer = () =>
    setContainers((cs) => {
      const i = cs.findIndex((c) => c.id === sel?.containerId);
      if (i < 0) return cs;
      const copy = reId([cs[i] as Container])[0] as Container;
      const next = [...cs];
      next.splice(i + 1, 0, copy);
      return next;
    });

  const deleteContainer = () => {
    setContainers((cs) => cs.filter((c) => c.id !== sel?.containerId));
    setSel(null);
    toast.success("Container deleted");
  };

  const moveElement = (dir: -1 | 1) =>
    setContainers((cs) =>
      cs.map((c) =>
        c.id !== sel?.containerId
          ? c
          : {
              ...c,
              columns: c.columns.map((col, ci) => {
                if (ci !== sel?.colIndex) return col;
                const i = col.findIndex((e) => e.id === sel.elementId);
                const j = i + dir;
                if (i < 0 || j < 0 || j >= col.length) return col;
                const next = [...col];
                const [x] = next.splice(i, 1);
                next.splice(j, 0, x!);
                return next;
              }),
            },
      ),
    );

  const deleteElement = () => {
    setContainers((cs) =>
      cs.map((c) =>
        c.id !== sel?.containerId
          ? c
          : {
              ...c,
              columns: c.columns.map((col, ci) =>
                ci !== sel?.colIndex ? col : col.filter((e) => e.id !== sel.elementId),
              ),
            },
      ),
    );
    setSel(sel ? { ...sel, elementId: null } : null);
    toast.success("Element deleted");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      if (nav !== "build" || preview) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable ||
        target?.closest("[role='dialog']")
      ) {
        return;
      }
      if (!sel?.containerId) return;
      e.preventDefault();
      if (sel.elementId) deleteElement();
      else deleteContainer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav, preview, sel]);

  const fireCta = (c: Cta) =>
    toast(`Tracking: ${c.event}`, { description: `${c.action} → ${c.destination || "—"}` });

  const startFromTemplate = (tpl: Template) => {
    const containers = reId(tpl.containers);

    setPage((p) => ({
      ...p,
      id: uid(),
      name: `${tpl.name} page`,
      slug: tpl.name.toLowerCase().replace(/\s+/g, "-"),
      status: "draft",
      containers,
    }));
    setSel(null);
    setNav("build");
    toast.success(`New page started from "${tpl.name}"`);
  };

  /**
   * Saves the page, or one container, into the shared library.
   *
   * The tree is sent through `reId` as well: a template that kept the ids of
   * the page it came from would collide with that page the moment both were
   * open in one session.
   */
  const saveTemplate = async (name: string, description: string) => {
    if (!saveTpl) return;

    const source =
      saveTpl.kind === "block"
        ? page.containers.filter((c) => c.id === saveTpl.containerId)
        : page.containers;

    if (source.length === 0) {
      toast.error("Nothing to save");
      return;
    }

    setSavingTpl(true);
    try {
      const saved = await createTemplate({
        name,
        description,
        category: saveTpl.kind === "block" ? "Blocks" : "Custom",
        kind: saveTpl.kind,
        containers: reId(source),
      });
      setTemplates((ts) => [saved, ...ts]);
      setSaveTpl(null);
      toast.success(`${saveTpl.kind === "block" ? "Block" : "Template"} "${name}" saved`);
    } catch (error) {
      toast.error("Couldn't save", {
        description: error instanceof Error ? error.message : "The publishing API is unreachable.",
      });
    } finally {
      setSavingTpl(false);
    }
  };

  const removeTemplate = async (id: string) => {
    const previous = templates;
    setTemplates((ts) => ts.filter((x) => x.id !== id));
    try {
      await deleteTemplateRequest(id);
    } catch (error) {
      setTemplates(previous);
      toast.error("Couldn't delete template", {
        description: error instanceof Error ? error.message : "The publishing API is unreachable.",
      });
    }
  };

  /**
   * Commits a double-click edit made directly on the canvas.
   *
   * Addresses the element by id rather than through `sel`, so editing works
   * without selecting first, and writes only the current language's half of the
   * LText at that path.
   */
  const editText = (
    containerId: string,
    colIndex: number,
    elementId: string,
    path: string,
    value: string,
  ) =>
    setContainers((cs) =>
      cs.map((c) =>
        c.id !== containerId
          ? c
          : {
              ...c,
              columns: c.columns.map((col, i) =>
                i !== colIndex
                  ? col
                  : col.map((e) =>
                      e.id !== elementId
                        ? e
                        : { ...e, props: setLocalizedText(e.props, path, lang, value) },
                    ),
              ),
            },
      ),
    );

  /* ---------------------------------------------------------------- drag & drop */

  const endDrag = () => {
    setDrag(null);
    setDropSlot(null);
    setContainerSlot(null);
  };

  /** A block lands between containers, so column drop targets ignore it. */
  const elementDrag = drag?.kind === "move" || drag?.kind === "new";

  /** Tracks the insertion slot the pointer is currently over. */
  const hoverSlot = (slot: DropSlot) => {
    setDropSlot((prev) =>
      prev &&
      prev.containerId === slot.containerId &&
      prev.colIndex === slot.colIndex &&
      prev.index === slot.index
        ? prev
        : slot,
    );
  };

  const completeDrop = () => {
    if (!drag || !dropSlot) return endDrag();

    if (drag.kind === "block") return endDrag();

    if (drag.kind === "new") {
      const el = newElement(drag.type);
      setContainers((cs) => putElement(cs, dropSlot, el));
      setSel({ containerId: dropSlot.containerId, colIndex: dropSlot.colIndex, elementId: el.id });
      toast.success("Element added");
    } else if (!isNoOpDrop(page.containers, drag, dropSlot)) {
      setContainers((cs) => moveElementTo(cs, drag, dropSlot));
      setSel({
        containerId: dropSlot.containerId,
        colIndex: dropSlot.colIndex,
        elementId: drag.elementId,
      });
    }

    endDrag();
  };

  /**
   * Picks the insertion index from where the pointer sits relative to an
   * element's midpoint — above it means before, below means after.
   */
  const slotFromPointer = (
    e: React.DragEvent,
    containerId: string,
    colIndex: number,
    index: number,
  ) => {
    const box = e.currentTarget.getBoundingClientRect();
    const after = e.clientY > box.top + box.height / 2;
    hoverSlot({ containerId, colIndex, index: after ? index + 1 : index });
  };

  const isSlot = (containerId: string, colIndex: number, index: number) =>
    dropSlot?.containerId === containerId &&
    dropSlot.colIndex === colIndex &&
    dropSlot.index === index;

  /* ------------------------------------------------------------ blocks on canvas */

  /**
   * Inserts a saved block and shows where it went.
   *
   * Dropping already tells you the position, but adding one by click does not,
   * so both paths land here and the new container is selected, scrolled to and
   * outlined for a moment.
   */
  const insertBlock = (tpl: Template, index: number) => {
    const incoming = reId(tpl.containers);
    const first = incoming[0];
    if (!first) return;

    setContainers((cs) => insertContainers(cs, index, incoming));
    setSel({ containerId: first.id, colIndex: null, elementId: null });
    setNav("build");
    setFlash(first.id);
    toast.success(`Block "${tpl.name}" inserted`);
  };

  /** Tracks which gap between containers a dragged block is pointing at. */
  const hoverContainerSlot = (index: number) =>
    setContainerSlot((prev) => (prev?.index === index ? prev : { index }));

  const completeContainerDrop = () => {
    if (drag?.kind !== "block" || !containerSlot) return endDrag();

    const tpl = templates.find((x) => x.id === drag.templateId);
    if (tpl) insertBlock(tpl, containerSlot.index);
    endDrag();
  };

  /**
   * The gap between two containers, as a drop target.
   *
   * Zero height with an absolutely positioned hit area, so turning the targets
   * on at the start of a drag does not shift the canvas under the pointer.
   */
  const containerGap = (index: number) => {
    const dragging = drag?.kind === "block";
    return (
      <div className="relative h-0">
        <div
          onDragOver={(e) => {
            if (!dragging) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            hoverContainerSlot(index);
          }}
          onDrop={(e) => {
            if (!dragging) return;
            e.preventDefault();
            e.stopPropagation();
            completeContainerDrop();
          }}
          className={cn(
            "absolute inset-x-0 -top-3 z-30 h-6",
            dragging ? "pointer-events-auto" : "pointer-events-none",
          )}
        >
          {dragging && containerSlot?.index === index && (
            <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand shadow-brand" />
          )}
        </div>
      </div>
    );
  };

  /** Builds the payload locally, so generated HTML is inspectable with no backend. */
  const inspectOutput = () => setOutput({ payload: buildPayload(page), published: false });

  const openPublishedPage = async (summary: PageSummary) => {
    setOpeningPage(summary.slug);
    try {
      const source = await fetchPageForEditing(summary.slug);
      setPage(source);
      setLang(source.languages[0] ?? "en");
      setSel(null);
      setOutput(null);
      setNav("build");
      toast.success(`Opened "${source.name || source.slug}" for editing`);
    } catch (error) {
      toast.error("Couldn't open page", {
        description: error instanceof Error ? error.message : "The publishing API is unreachable.",
      });
    } finally {
      setOpeningPage(null);
    }
  };

  const removePublishedPage = async (summary: PageSummary) => {
    if (!window.confirm(`Delete "${summary.name || summary.slug}"? This cannot be undone.`)) return;

    setDeletingPage(summary.slug);
    try {
      await deletePageRequest(summary.slug);
      setPages((current) => current.filter((item) => item.slug !== summary.slug));
      if (page.slug === summary.slug) setPage((current) => ({ ...current, status: "draft" }));
      toast.success("Page deleted", { description: `/${summary.slug}` });
    } catch (error) {
      toast.error("Couldn't delete page", {
        description: error instanceof Error ? error.message : "The publishing API is unreachable.",
      });
    } finally {
      setDeletingPage(null);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const payload = await publishPage(page);
      setPage((p) => ({ ...p, status: "published" }));
      fetchPages()
        .then(setPages)
        .catch(() => undefined);
      setOutput({ payload, published: true });
      toast.success("Page published", { description: publishedUrl(payload.slug, lang) });
    } catch (error) {
      toast.error("Publish failed — is the mock backend running?", {
        description: `Run: cd mock-backend && node server.js — ${String(error)}`,
      });
    } finally {
      setPublishing(false);
    }
  };

  const targetLabel = container ? `${container.name} · column ${(sel?.colIndex ?? 0) + 1}` : "";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-surface text-foreground">
      <Toaster position="bottom-right" />

      {/* Navigation rail */}
      <nav className="flex w-16 shrink-0 flex-col items-center gap-1 border-e border-border bg-background py-3">
        <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-brand text-xs font-black text-brand-foreground">
          4S
        </div>
        {NAV.map((n) => (
          <button
            key={n.key}
            type="button"
            onClick={() => setNav(n.key)}
            className={cn(
              "flex w-14 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium transition",
              nav === n.key
                ? "bg-brand-soft text-brand"
                : "text-muted-foreground hover:bg-neutral-surface",
            )}
          >
            <Icon name={n.icon} className="size-4" />
            {n.label}
          </button>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold">{page.name}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    page.status === "published"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-neutral-surface text-muted-foreground",
                  )}
                >
                  {page.status === "published" ? "Published" : "Draft"}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                q84sale.com/{lang}/{page.slug}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-neutral-surface p-1">
              {(["en", "ar"] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-semibold uppercase transition",
                    lang === l ? "bg-background text-brand shadow-panel" : "text-muted-foreground",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg bg-neutral-surface p-1">
              {(["desktop", "mobile"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDevice(d)}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 transition",
                    device === d
                      ? "bg-background text-brand shadow-panel"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon name={d === "desktop" ? "Monitor" : "Smartphone"} className="size-3.5" />
                </button>
              ))}
            </div>
            <ZoomControls zoom={zoom} onChange={setZoom} />
            <button
              type="button"
              onClick={() => setSaveTpl({ kind: "page" })}
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-neutral-surface"
            >
              Save as template
            </button>
            <button
              type="button"
              onClick={() => toast.success("Draft saved")}
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-neutral-surface"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => setPreview(true)}
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-neutral-surface"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={inspectOutput}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-neutral-surface"
              title="Inspect the HTML this page publishes as"
            >
              <Icon name="Code2" className="size-3.5" /> HTML
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground shadow-brand transition hover:bg-brand-strong disabled:opacity-60"
            >
              {publishing ? "Publishing…" : "Publish"}
            </button>
          </div>
        </header>

        {nav === "pages" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PagesScreen
              pages={pages}
              loading={pagesLoading}
              opening={openingPage}
              deleting={deletingPage}
              onOpen={openPublishedPage}
              onDelete={removePublishedPage}
              onRefresh={() => {
                setPagesLoading(true);
                fetchPages()
                  .then(setPages)
                  .catch((error: unknown) =>
                    toast.error("Couldn't refresh pages", {
                      description:
                        error instanceof Error
                          ? error.message
                          : "The publishing API is unreachable.",
                    }),
                  )
                  .finally(() => setPagesLoading(false));
              }}
            />
          </div>
        ) : nav === "build" ? (
          <div className="min-h-0 flex-1">
            <ResizablePanelGroup id="builder" className="h-full">
              <ResizablePanel
                id="elements"
                defaultSize={288}
                minSize={200}
                maxSize={420}
                collapsible
                groupResizeBehavior="preserve-pixel-size"
                className="h-full overflow-hidden bg-background"
              >
                <div className="h-full overflow-hidden">
                  <ElementsPanel
                    onAddContainer={addContainer}
                    onAddElement={addElement}
                    canAddElement={!!container && sel?.colIndex != null}
                    targetLabel={targetLabel}
                    blocks={blocks}
                    blocksLoading={templatesLoading}
                    onDragElement={(type) => setDrag({ kind: "new", type })}
                    onDragBlock={(templateId) => setDrag({ kind: "block", templateId })}
                    onAddBlock={(tpl) => {
                      const at = page.containers.findIndex((c) => c.id === sel?.containerId);
                      insertBlock(tpl, at < 0 ? page.containers.length : at + 1);
                    }}
                    onDeleteBlock={removeTemplate}
                    onDragEnd={endDrag}
                  />
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle className="w-1.5 bg-border hover:bg-brand/40" />

              <ResizablePanel id="canvas" minSize={280} className="min-w-0">
                <div ref={canvasRef} className="h-full min-w-0 overflow-auto p-6">
                  <ZoomStage zoom={zoom}>
                    <div
                      className={cn(
                        // @container makes the element grids below break on THIS
                        // wrapper's width, so the mobile toggle actually reflows.
                        // Zoom is a visual scale only — it must not change this width.
                        "@container/page mx-auto overflow-hidden rounded-2xl bg-background shadow-card transition-[max-width]",
                        device === "mobile" ? "max-w-sm" : "max-w-none",
                      )}
                      dir={lang === "ar" ? "rtl" : "ltr"}
                    >
                      {page.containers.map((c, index) => {
                        const active = sel?.containerId === c.id && !sel.elementId;
                        const inContainer = sel?.containerId === c.id;
                        const vertical = containerDirection(c.direction) === "vertical";
                        const tracks = containerTracks(c);
                        return (
                          <Fragment key={c.id}>
                            {containerGap(index)}
                            <div
                              ref={(node) => {
                                if (node) containerNodes.current.set(c.id, node);
                                else containerNodes.current.delete(c.id);
                              }}
                              className={cn(
                                "group relative border-2 transition",
                                flash === c.id
                                  ? "border-brand ring-4 ring-brand/30"
                                  : active
                                    ? "border-brand"
                                    : "border-transparent hover:border-brand/30",
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSel({ containerId: c.id, colIndex: 0, elementId: null });
                              }}
                            >
                            <div
                              className={cn(
                                "absolute -top-px start-0 z-20 rounded-be-lg bg-brand px-2 py-0.5 text-[10px] font-semibold text-brand-foreground transition",
                                active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                              )}
                            >
                              {c.name}
                            </div>
                            <ContainerView container={c} lang={lang}>
                              {(ci) => {
                                const col = c.columns[ci] ?? [];
                                const colActive = active && sel?.colIndex === ci;
                                const colTargeted =
                                  dropSlot?.containerId === c.id && dropSlot.colIndex === ci;
                                return (
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSel({ containerId: c.id, colIndex: ci, elementId: null });
                                    }}
                                    // Dropping anywhere in the column that isn't over an
                                    // element appends to the end.
                                    onDragOver={(e) => {
                                      if (!elementDrag) return;
                                      e.preventDefault();
                                      hoverSlot({
                                        containerId: c.id,
                                        colIndex: ci,
                                        index: col.length,
                                      });
                                    }}
                                    onDrop={(e) => {
                                      if (!elementDrag) return;
                                      e.preventDefault();
                                      e.stopPropagation();
                                      completeDrop();
                                    }}
                                    className={cn(
                                      "relative h-full min-h-16 space-y-5 rounded-xl border border-dashed p-2 transition",
                                      elementDrag && colTargeted
                                        ? "border-brand bg-brand/10"
                                        : elementDrag
                                          ? "border-brand/40"
                                          : colActive
                                            ? "border-brand bg-brand/5"
                                            : "border-transparent hover:border-brand/30",
                                    )}
                                  >
                                    {col.length === 0 && (
                                      <div className="flex h-16 items-center justify-center text-[11px] text-muted-foreground">
                                        {elementDrag
                                          ? "Drop here"
                                          : "Empty column — drag an element in, or select this column"}
                                      </div>
                                    )}
                                    {col.map((el, ei) => {
                                      const elActive = sel?.elementId === el.id;
                                      const dragging =
                                        drag?.kind === "move" && drag.elementId === el.id;
                                      return (
                                        <div
                                          key={el.id}
                                          // A draggable ancestor hijacks text selection,
                                          // so dragging is off while editing in place.
                                          draggable={inlineEdit?.elementId !== el.id}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSel({
                                              containerId: c.id,
                                              colIndex: ci,
                                              elementId: el.id,
                                            });
                                          }}
                                          onDragStart={(e) => {
                                            // Firefox refuses to start a drag without payload.
                                            e.dataTransfer.setData("text/plain", el.id);
                                            e.dataTransfer.effectAllowed = "move";
                                            setDrag({
                                              kind: "move",
                                              containerId: c.id,
                                              colIndex: ci,
                                              elementId: el.id,
                                            });
                                          }}
                                          onDragEnd={endDrag}
                                          onDragOver={(e) => {
                                            if (!elementDrag) return;
                                            e.preventDefault();
                                            e.stopPropagation();
                                            slotFromPointer(e, c.id, ci, ei);
                                          }}
                                          className={cn(
                                            "relative cursor-grab rounded-lg outline-offset-4 transition active:cursor-grabbing",
                                            dragging && "opacity-40",
                                            elActive
                                              ? "outline-2 outline-brand"
                                              : "hover:outline-2 hover:outline-brand/30",
                                          )}
                                        >
                                          {/* Insertion indicators, absolutely positioned so
                                        the column doesn't reflow mid-drag. */}
                                          {isSlot(c.id, ci, ei) && (
                                            <span className="absolute inset-x-0 -top-3 z-20 h-1 rounded-full bg-brand" />
                                          )}
                                          {isSlot(c.id, ci, ei + 1) && (
                                            <span className="absolute inset-x-0 -bottom-3 z-20 h-1 rounded-full bg-brand" />
                                          )}
                                          <span
                                            className={cn(
                                              "absolute -start-1 -top-1 z-20 flex size-5 items-center justify-center rounded-md bg-brand text-brand-foreground transition",
                                              elActive
                                                ? "opacity-100"
                                                : "opacity-0 hover:opacity-100",
                                            )}
                                            title="Drag to reorder"
                                          >
                                            <Icon name="GripVertical" className="size-3" />
                                          </span>
                                          <ElementView
                                            el={el}
                                            lang={lang}
                                            editing
                                            onFire={fireCta}
                                            onEditText={(path, value) =>
                                              editText(c.id, ci, el.id, path, value)
                                            }
                                            editingPath={
                                              inlineEdit?.elementId === el.id
                                                ? inlineEdit.path
                                                : null
                                            }
                                            onStartEdit={(path) =>
                                              setInlineEdit({ elementId: el.id, path })
                                            }
                                            onStopEdit={() => setInlineEdit(null)}
                                          />
                                          {elActive &&
                                          (el.type === "image" || el.type === "spacer") ? (
                                            <BoxResizeFrame
                                              onStart={() => {
                                                heightDrag.current =
                                                  Number(el.props["height"]) ||
                                                  (el.type === "image" ? 320 : 40);
                                              }}
                                              onMove={(deltaHeight) => {
                                                const min = el.type === "image" ? 80 : 8;
                                                const max = el.type === "image" ? 800 : 240;
                                                const next = Math.round(
                                                  Math.min(
                                                    max,
                                                    Math.max(min, heightDrag.current + deltaHeight),
                                                  ),
                                                );
                                                updateElement({ height: next });
                                              }}
                                            />
                                          ) : null}
                                        </div>
                                      );
                                    })}
                                    {ci < tracks.length - 1 ? (
                                      <EdgeResizeHandle
                                        axis={vertical ? "y" : "x"}
                                        rtl={lang === "ar"}
                                        visible={inContainer}
                                        label={vertical ? "Resize row" : "Resize column"}
                                        onStart={() => {
                                          trackDrag.current = {
                                            id: c.id,
                                            tracks: containerTracks(c),
                                          };
                                        }}
                                        onMove={(deltaPx, spanPx) => {
                                          const snap = trackDrag.current;
                                          if (!snap || snap.id !== c.id) return;
                                          patchContainer(c.id, {
                                            tracks: nudgeTracks(snap.tracks, ci, deltaPx / spanPx),
                                          });
                                        }}
                                        onEnd={() => {
                                          trackDrag.current = null;
                                        }}
                                      />
                                    ) : null}
                                  </div>
                                );
                              }}
                            </ContainerView>
                            {active ? (
                              <BoxResizeFrame
                                onStart={(host) => {
                                  heightDrag.current = c.minHeight || host.offsetHeight;
                                }}
                                onMove={(deltaHeight) => {
                                  const next = Math.round(
                                    Math.min(1200, Math.max(80, heightDrag.current + deltaHeight)),
                                  );
                                  patchContainer(c.id, { minHeight: next });
                                }}
                              />
                            ) : null}
                          </div>
                          </Fragment>
                        );
                      })}

                      {containerGap(page.containers.length)}

                      <button
                        type="button"
                        onClick={() => addContainer("1")}
                        className="flex w-full items-center justify-center gap-2 border-t border-dashed border-border py-6 text-xs font-medium text-muted-foreground hover:bg-brand-soft/50 hover:text-brand"
                      >
                        <Icon name="Plus" className="size-4" /> Add container
                      </button>
                    </div>
                  </ZoomStage>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle className="w-1.5 bg-border hover:bg-brand/40" />

              <ResizablePanel
                id="properties"
                defaultSize={320}
                minSize={240}
                maxSize={480}
                collapsible
                groupResizeBehavior="preserve-pixel-size"
                className="h-full overflow-hidden bg-background"
              >
                <div className="flex h-full flex-col">
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <PropertiesPanel
                      container={container}
                      element={element}
                      lang={lang}
                      updateContainer={updateContainer}
                      updateElement={updateElement}
                      onDeleteElement={deleteElement}
                      onMoveElement={moveElement}
                      onDuplicateContainer={duplicateContainer}
                      onSaveContainerAsBlock={() =>
                        container &&
                        setSaveTpl({
                          kind: "block",
                          containerId: container.id,
                          containerName: container.name,
                        })
                      }
                      onDeleteContainer={deleteContainer}
                      onMoveContainer={moveContainer}
                    />
                  </div>
                  <div className="max-h-[45%] shrink-0 overflow-y-auto border-t border-border bg-neutral-surface/40">
                    <PageSettingsPanel
                      page={page}
                      lang={lang}
                      setLang={setLang}
                      onChange={(patch) => setPage((p) => ({ ...p, ...patch }))}
                    />
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        ) : nav === "templates" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <TemplatesScreen
              templates={pageTemplates}
              loading={templatesLoading}
              onUse={startFromTemplate}
              onBlank={() => {
                setPage((p) => ({
                  ...p,
                  id: uid(),
                  name: "Untitled landing page",
                  slug: "untitled-landing-page",
                  status: "draft",
                  containers: [newContainer("1", 1)],
                }));
                setSel(null);
                setNav("build");
              }}
              onDelete={removeTemplate}
            />
          </div>
        ) : nav === "seo" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SeoPanel
              page={page}
              lang={lang}
              onChange={(patch) => setPage((p) => ({ ...p, seo: { ...p.seo, ...patch } }))}
            />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AssetsScreen />
          </div>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-neutral-900/60">
          <div className="flex h-14 items-center justify-between bg-background px-4">
            <div className="text-sm font-semibold">
              Preview ·{" "}
              <span className="font-normal text-muted-foreground">
                q84sale.com/{lang}/{page.slug}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg bg-neutral-surface p-1">
                {(["en", "ar"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-semibold uppercase",
                      lang === l
                        ? "bg-background text-brand shadow-panel"
                        : "text-muted-foreground",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <div className="flex rounded-lg bg-neutral-surface p-1">
                {(["desktop", "mobile"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDevice(d)}
                    className={cn(
                      "rounded-md px-2.5 py-1.5",
                      device === d
                        ? "bg-background text-brand shadow-panel"
                        : "text-muted-foreground",
                    )}
                  >
                    <Icon name={d === "desktop" ? "Monitor" : "Smartphone"} className="size-3.5" />
                  </button>
                ))}
              </div>
              <ZoomControls zoom={zoom} onChange={setZoom} />
              <button
                type="button"
                onClick={() => setPreview(false)}
                className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground"
              >
                Close preview
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-neutral-surface p-4">
            <ZoomStage zoom={zoom}>
              <div
                className={cn(
                  "@container/page mx-auto overflow-hidden rounded-2xl bg-background shadow-lift",
                  device === "mobile" ? "max-w-sm" : "max-w-none",
                )}
              >
                <SiteChrome lang={lang} />
                <PageRenderer containers={page.containers} lang={lang} onFire={fireCta} />
                <SiteFooter lang={lang} />
              </div>
            </ZoomStage>
          </div>
        </div>
      )}

      {output && (
        <PublishPanel
          payload={output.payload}
          published={output.published}
          onClose={() => setOutput(null)}
        />
      )}

      <SaveTemplateDialog
        target={saveTpl}
        saving={savingTpl}
        onClose={() => setSaveTpl(null)}
        onSave={saveTemplate}
      />
    </div>
  );
}

function ZoomControls({ zoom, onChange }: { zoom: number; onChange: (z: number) => void }) {
  return (
    <div className="flex items-center rounded-lg bg-neutral-surface p-1">
      <button
        type="button"
        onClick={() => onChange(clampZoom(zoom - ZOOM_STEP))}
        disabled={zoom <= ZOOM_MIN}
        className="rounded-md px-1.5 py-1.5 text-muted-foreground transition hover:bg-background hover:text-brand disabled:opacity-40"
        title="Zoom out"
      >
        <Icon name="Minus" className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onChange(100)}
        className="min-w-12 px-1 text-center text-[11px] font-semibold tabular-nums text-foreground"
        title="Reset zoom"
      >
        {zoom}%
      </button>
      <button
        type="button"
        onClick={() => onChange(clampZoom(zoom + ZOOM_STEP))}
        disabled={zoom >= ZOOM_MAX}
        className="rounded-md px-1.5 py-1.5 text-muted-foreground transition hover:bg-background hover:text-brand disabled:opacity-40"
        title="Zoom in"
      >
        <Icon name="Plus" className="size-3.5" />
      </button>
    </div>
  );
}

/**
 * Scales the artboard visually without changing its layout width, so container
 * queries and the Desktop/Mobile toggle keep working. The wrapper's height is
 * the scaled height so the parent can scroll instead of leaving empty space.
 */
function ZoomStage({ zoom, children }: { zoom: number; children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [naturalH, setNaturalH] = useState(0);
  const scale = zoom / 100;
  const grow = Math.max(scale, 1);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const update = () => setNaturalH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoom]);

  return (
    <div className="flex justify-center" style={{ minWidth: "100%" }}>
      <div
        style={{
          width: `${grow * 100}%`,
          ...(naturalH > 0 ? { height: naturalH * scale } : {}),
        }}
      >
        <div
          ref={innerRef}
          style={{
            width: `${100 / grow}%`,
            transform: `scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SiteChrome({ lang }: { lang: Lang }) {
  const links =
    lang === "ar"
      ? ["السيارات", "العقارات", "إلكترونيات", "خدمات"]
      : ["Cars", "Real Estate", "Electronics", "Services"];
  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex size-8 items-center justify-center rounded-lg bg-brand text-[11px] font-black text-brand-foreground">
            4S
          </div>
          <nav className="hidden gap-5 text-sm font-medium text-foreground/70 @min-[768px]:flex">
            {links.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="rounded-lg border border-border px-3 py-1.5">
            {lang === "ar" ? "English" : "العربية"}
          </span>
          <span className="rounded-lg bg-brand px-3 py-1.5 text-brand-foreground">
            {lang === "ar" ? "أضف إعلانك" : "Post an ad"}
          </span>
        </div>
      </div>
    </div>
  );
}

function SiteFooter({ lang }: { lang: Lang }) {
  return (
    <footer
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="border-t border-border bg-neutral-surface"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} 4Sale — q84sale.com</span>
        <span>{t({ en: "Terms · Privacy · Help", ar: "الشروط · الخصوصية · المساعدة" }, lang)}</span>
      </div>
    </footer>
  );
}
