import { useState } from "react";
import { type Template, type TemplateKind } from "@/lib/builder-types";
import { LucideIcon } from "./renderer";
import { BlockPreview } from "./block-preview";
import { Field, Pill, TextArea, TextInput } from "./controls";

/**
 * Whole-page templates only.
 *
 * Saved blocks are not listed here: a block is dropped into the page you are
 * already editing, so it belongs in the left panel next to the elements, while
 * this screen is about starting a new page.
 */
export function TemplatesScreen({
  templates,
  loading,
  onUse,
  onBlank,
  onDelete,
}: {
  /** Page templates. Blocks are filtered out by the caller. */
  templates: Template[];
  /** True while the saved templates are still being fetched. */
  loading: boolean;
  onUse: (tpl: Template) => void;
  onBlank: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Page templates</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Start a new landing page from a blank canvas or a saved template. Using one never changes
          the original. Individual sections live in the Blocks tab of the left panel.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <button
          type="button"
          onClick={onBlank}
          className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-background p-6 transition hover:border-brand hover:bg-brand-soft/40"
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <LucideIcon name="Plus" className="size-5" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold">Start from blank canvas</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Build a structure from scratch</p>
          </div>
        </button>

        {templates.map((tpl) => (
          <TemplateCard key={tpl.id} tpl={tpl} onUse={onUse} onDelete={onDelete} />
        ))}
      </div>

      {loading && templates.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">Loading saved templates…</p>
      )}
    </div>
  );
}

function TemplateCard({
  tpl,
  onUse,
  onDelete,
}: {
  tpl: Template;
  onUse: (tpl: Template) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex min-h-52 flex-col overflow-hidden rounded-2xl border border-border bg-background transition hover:shadow-lift">
      {/* The opening container, drawn the same way a saved block is. */}
      {tpl.containers[0] ? (
        <BlockPreview container={tpl.containers[0]} className="min-h-28 flex-1 gap-3 p-5" />
      ) : (
        <div className="min-h-28 flex-1 bg-neutral-surface" />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold">{tpl.name}</h3>
          {tpl.system && <Pill tone="muted">System</Pill>}
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{tpl.description}</p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onUse(tpl)}
            className="flex-1 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-strong"
          >
            Use template
          </button>
          {!tpl.system && (
            <button
              type="button"
              onClick={() => onDelete(tpl.id)}
              title="Delete template"
              className="rounded-lg border border-border p-2 text-muted-foreground hover:border-destructive hover:text-destructive"
            >
              <LucideIcon name="Trash2" className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SaveTemplateDialog({
  target,
  saving,
  onClose,
  onSave,
}: {
  /** What is being saved, or null when the dialog is closed. */
  target: { kind: TemplateKind; containerName?: string } | null;
  saving: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  if (!target) return null;

  const isBlock = target.kind === "block";

  const submit = () => {
    onSave(name.trim(), description.trim() || "Saved from the builder.");
    setName("");
    setDescription("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-lift">
        <h2 className="text-lg font-semibold">
          {isBlock ? "Save as block" : "Save page as template"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {isBlock
            ? `Saves the “${target.containerName}” container so it can be inserted into any page. Its content comes along and stays editable per page.`
            : "Saves every container, column layout, element and design setting on this page. SEO fields are not included — each page needs its own."}
        </p>
        <div className="mt-4 space-y-3">
          <Field label={isBlock ? "Block name" : "Template name"}>
            <TextInput
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim() && !saving) submit();
              }}
              placeholder={isBlock ? "e.g. Campaign hero" : "e.g. Campaign landing page"}
            />
          </Field>
          <Field label="Description">
            <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-neutral-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim() || saving}
            onClick={submit}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground disabled:opacity-40"
          >
            {saving ? "Saving…" : isBlock ? "Save block" : "Save template"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AssetsScreen() {
  const assets = [
    "hero-business.jpg",
    "feature-app.jpg",
    "4sale-logo.svg",
    "campaign-banner.jpg",
    "category-cars.jpg",
    "icon-verified.svg",
  ];
  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shared media library for landing pages. Upload is mocked in this prototype.
          </p>
        </div>
        <Pill tone="warn">Storage integration pending</Pill>
      </header>
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <div className="flex aspect-4/3 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground">
          <LucideIcon name="UploadCloud" className="size-5" />
          <span className="text-xs font-medium">Upload asset</span>
        </div>
        {assets.map((a) => (
          <div key={a} className="overflow-hidden rounded-2xl border border-border bg-background">
            <div className="flex aspect-4/3 items-center justify-center bg-neutral-surface text-muted-foreground">
              <LucideIcon name="Image" className="size-6" />
            </div>
            <div className="p-3 text-xs font-medium">{a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
