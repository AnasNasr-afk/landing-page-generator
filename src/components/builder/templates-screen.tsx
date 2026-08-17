import { useState } from "react";
import { type Template } from "@/lib/builder-types";
import { LucideIcon } from "./renderer";
import { Field, Pill, TextArea, TextInput } from "./controls";

export function TemplatesScreen({
  templates,
  onUse,
  onBlank,
  onDelete,
}: {
  templates: Template[];
  onUse: (tpl: Template) => void;
  onBlank: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Templates library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start a new landing page from blank canvas or any saved template. Editing a new page never
          changes the original template.
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
          <div
            key={tpl.id}
            className="flex min-h-52 flex-col overflow-hidden rounded-2xl border border-border bg-background transition hover:shadow-lift"
          >
            <div className="flex-1 space-y-1.5 bg-neutral-surface p-4">
              {tpl.containers.slice(0, 5).map((c) => (
                <div key={c.id} className="flex gap-1.5" style={{ height: Math.max(8, c.paddingY / 6) }}>
                  {c.columns.map((_, i) => (
                    <div
                      key={i}
                      className={
                        "flex-1 rounded-sm " +
                        (c.background === "brand" ? "bg-brand/70" : c.background === "soft" ? "bg-brand/20" : "bg-neutral-300/60")
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{tpl.name}</h3>
                <Pill tone={tpl.system ? "muted" : "brand"}>{tpl.system ? "System" : "Saved"}</Pill>
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
                    className="rounded-lg border border-border p-2 text-muted-foreground hover:border-destructive hover:text-destructive"
                  >
                    <LucideIcon name="Trash2" className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SaveTemplateDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-lift">
        <h2 className="text-lg font-semibold">Save as template</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Saves containers, column layouts, element types, design settings and structure — content stays
          editable per page.
        </p>
        <div className="mt-4 space-y-3">
          <Field label="Template name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Campaign hero + form" />
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
            disabled={!name.trim()}
            onClick={() => {
              onSave(name.trim(), description.trim() || "Saved from the builder.");
              setName("");
              setDescription("");
            }}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground disabled:opacity-40"
          >
            Save template
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
