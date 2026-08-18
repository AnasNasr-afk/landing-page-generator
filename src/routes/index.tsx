import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import {
  COLUMN_COUNT,
  type Container,
  type ContainerLayout,
  type Cta,
  type ElementType,
  type Lang,
  type LandingPage,
  type Template,
  reId,
  t,
  uid,
} from "@/lib/builder-types";
import { newContainer, newElement, seedPage, seedTemplates } from "@/lib/builder-content";
import {
  type DragPayload,
  type DropSlot,
  isNoOpDrop,
  moveElement as moveElementTo,
  putElement,
  setLocalizedText,
} from "@/lib/builder-move";
import { ContainerView, ElementView, LucideIcon, PageRenderer } from "@/components/builder/renderer";
import { ElementsPanel } from "@/components/builder/elements-panel";
import { PropertiesPanel } from "@/components/builder/properties-panel";
import { PageSettingsPanel, SeoPanel } from "@/components/builder/seo-panel";
import { AssetsScreen, SaveTemplateDialog, TemplatesScreen } from "@/components/builder/templates-screen";
import { PublishPanel } from "@/components/builder/publish-panel";
import {
  type PublishPayload,
  buildPayload,
  publishPage,
  publishedUrl,
} from "@/lib/publish/payload";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "4Sale Landing Page Builder — No-code Page Studio" },
      {
        name: "description",
        content:
          "Self-service 4Sale landing page builder: containers, CTAs, lead forms, marketplace listings, reusable templates and an SEO & AI search panel.",
      },
      { property: "og:title", content: "4Sale Landing Page Builder" },
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

type Nav = "build" | "templates" | "seo" | "assets";
type Selection = { containerId: string; colIndex: number | null; elementId: string | null } | null;

const NAV: { key: Nav; icon: string; label: string }[] = [
  { key: "build", icon: "LayoutPanelTop", label: "Build" },
  { key: "templates", icon: "LayoutTemplate", label: "Templates" },
  { key: "seo", icon: "Search", label: "SEO" },
  { key: "assets", icon: "Images", label: "Assets" },
];

function BuilderApp() {
  const [page, setPage] = useState<LandingPage>(seedPage);
  const [templates, setTemplates] = useState<Template[]>(seedTemplates);
  const [nav, setNav] = useState<Nav>("build");
  const [lang, setLang] = useState<Lang>("en");
  const [sel, setSel] = useState<Selection>(null);
  const [preview, setPreview] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [saveTpl, setSaveTpl] = useState(false);
  const [output, setOutput] = useState<{
    payload: PublishPayload;
    published: boolean;
  } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [dropSlot, setDropSlot] = useState<DropSlot | null>(null);
  /**
   * The single text node being edited in place, canvas-wide. Owned here rather
   * than inside each element so only one node can ever be contentEditable.
   */
  const [inlineEdit, setInlineEdit] = useState<{ elementId: string; path: string } | null>(null);

  const container = useMemo(
    () => page.containers.find((c) => c.id === sel?.containerId),
    [page.containers, sel],
  );
  const element = useMemo(() => {
    if (!container || sel?.colIndex == null || !sel.elementId) return undefined;
    return container.columns[sel.colIndex]?.find((e) => e.id === sel.elementId);
  }, [container, sel]);

  const setContainers = (fn: (cs: Container[]) => Container[]) =>
    setPage((p) => ({ ...p, containers: fn(p.containers), status: "draft" }));

  const updateContainer = (patch: Partial<Container>) =>
    setContainers((cs) =>
      cs.map((c) => {
        if (c.id !== sel?.containerId) return c;
        let columns = c.columns;
        if (patch.layout) {
          const target = COLUMN_COUNT[patch.layout];
          columns = Array.from({ length: target }, (_, i) => c.columns[i] ?? []);
          if (c.columns.length > target) {
            const overflow = c.columns.slice(target).flat();
            columns = columns.map((col, i) => (i === target - 1 ? [...col, ...overflow] : col));
          }
        }
        return { ...c, ...patch, columns };
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
                  : col.map((e) => (e.id === sel.elementId ? { ...e, props: { ...e.props, ...patch } } : e)),
              ),
            },
      ),
    );

  const addContainer = (layout: ContainerLayout) => {
    const c = newContainer(layout, COLUMN_COUNT[layout]);
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
  };

  const fireCta = (c: Cta) =>
    toast(`Tracking: ${c.event}`, { description: `${c.action} → ${c.destination || "—"}` });

  const startFromTemplate = (tpl: Template) => {
    setPage((p) => ({
      ...p,
      id: uid(),
      name: `${tpl.name} page`,
      slug: tpl.name.toLowerCase().replace(/\s+/g, "-"),
      status: "draft",
      containers: reId(tpl.containers),
    }));
    setSel(null);
    setNav("build");
    toast.success(`New page started from "${tpl.name}"`);
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
  };

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

  /** Builds the payload locally, so generated HTML is inspectable with no backend. */
  const inspectOutput = () => setOutput({ payload: buildPayload(page), published: false });

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const payload = await publishPage(page);
      setPage((p) => ({ ...p, status: "published" }));
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

  const targetLabel = container
    ? `${container.name} · column ${(sel?.colIndex ?? 0) + 1}`
    : "";

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
              nav === n.key ? "bg-brand-soft text-brand" : "text-muted-foreground hover:bg-neutral-surface",
            )}
          >
            <LucideIcon name={n.icon} className="size-4" />
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
                    device === d ? "bg-background text-brand shadow-panel" : "text-muted-foreground",
                  )}
                >
                  <LucideIcon name={d === "desktop" ? "Monitor" : "Smartphone"} className="size-3.5" />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSaveTpl(true)}
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
              <LucideIcon name="Code2" className="size-3.5" /> HTML
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

        {nav === "build" ? (
          <div className="flex min-h-0 flex-1">
            <aside className="w-72 shrink-0 overflow-hidden border-e border-border bg-background">
              <ElementsPanel
                onAddContainer={addContainer}
                onAddElement={addElement}
                canAddElement={!!container && sel?.colIndex != null}
                targetLabel={targetLabel}
                onDragElement={(type) => setDrag({ kind: "new", type })}
                onDragEnd={endDrag}
              />
            </aside>

            <main className="min-w-0 flex-1 overflow-y-auto p-6">
              <div
                className={cn(
                  // @container makes the element grids below break on THIS
                  // wrapper's width, so the mobile toggle actually reflows.
                  "@container mx-auto overflow-hidden rounded-2xl bg-background shadow-card transition-all",
                  device === "mobile" ? "max-w-sm" : "max-w-none",
                )}
                dir={lang === "ar" ? "rtl" : "ltr"}
              >
                {page.containers.map((c) => {
                  const active = sel?.containerId === c.id && !sel.elementId;
                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "group relative border-2 transition",
                        active ? "border-brand" : "border-transparent hover:border-brand/30",
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
                                if (!drag) return;
                                e.preventDefault();
                                hoverSlot({ containerId: c.id, colIndex: ci, index: col.length });
                              }}
                              onDrop={(e) => {
                                if (!drag) return;
                                e.preventDefault();
                                e.stopPropagation();
                                completeDrop();
                              }}
                              className={cn(
                                "min-h-16 space-y-5 rounded-xl border border-dashed p-2 transition",
                                drag && colTargeted
                                  ? "border-brand bg-brand/10"
                                  : drag
                                    ? "border-brand/40"
                                    : colActive
                                      ? "border-brand bg-brand/5"
                                      : "border-transparent hover:border-brand/30",
                              )}
                            >
                              {col.length === 0 && (
                                <div className="flex h-16 items-center justify-center text-[11px] text-muted-foreground">
                                  {drag
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
                                      setSel({ containerId: c.id, colIndex: ci, elementId: el.id });
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
                                      if (!drag) return;
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
                                        elActive ? "opacity-100" : "opacity-0 hover:opacity-100",
                                      )}
                                      title="Drag to reorder"
                                    >
                                      <LucideIcon name="GripVertical" className="size-3" />
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
                                        inlineEdit?.elementId === el.id ? inlineEdit.path : null
                                      }
                                      onStartEdit={(path) =>
                                        setInlineEdit({ elementId: el.id, path })
                                      }
                                      onStopEdit={() => setInlineEdit(null)}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }}
                      </ContainerView>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => addContainer("1")}
                  className="flex w-full items-center justify-center gap-2 border-t border-dashed border-border py-6 text-xs font-medium text-muted-foreground hover:bg-brand-soft/50 hover:text-brand"
                >
                  <LucideIcon name="Plus" className="size-4" /> Add container
                </button>
              </div>
            </main>

            <aside className="w-80 shrink-0 overflow-hidden border-s border-border bg-background">
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
            </aside>
          </div>
        ) : nav === "templates" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <TemplatesScreen
              templates={templates}
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
              onDelete={(id) => setTemplates((ts) => ts.filter((x) => x.id !== id))}
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
              Preview · <span className="font-normal text-muted-foreground">q84sale.com/{lang}/{page.slug}</span>
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
                      "rounded-md px-2.5 py-1.5",
                      device === d ? "bg-background text-brand shadow-panel" : "text-muted-foreground",
                    )}
                  >
                    <LucideIcon name={d === "desktop" ? "Monitor" : "Smartphone"} className="size-3.5" />
                  </button>
                ))}
              </div>
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
            <div
              className={cn(
                "@container mx-auto overflow-hidden rounded-2xl bg-background shadow-lift",
                device === "mobile" ? "max-w-sm" : "max-w-none",
              )}
            >
              <SiteChrome lang={lang} />
              <PageRenderer containers={page.containers} lang={lang} onFire={fireCta} />
              <SiteFooter lang={lang} />
            </div>
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
        open={saveTpl}
        onClose={() => setSaveTpl(false)}
        onSave={(name, description) => {
          setTemplates((ts) => [
            { id: uid(), name, description, category: "Custom", containers: reId(page.containers) },
            ...ts,
          ]);
          setSaveTpl(false);
          toast.success(`Template "${name}" saved`);
        }}
      />
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
          <span className="rounded-lg border border-border px-3 py-1.5">{lang === "ar" ? "English" : "العربية"}</span>
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
    <footer dir={lang === "ar" ? "rtl" : "ltr"} className="border-t border-border bg-neutral-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} 4Sale — q84sale.com</span>
        <span>{t({ en: "Terms · Privacy · Help", ar: "الشروط · الخصوصية · المساعدة" }, lang)}</span>
      </div>
    </footer>
  );
}
