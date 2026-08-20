import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/builder-types";
import { PUBLISH_API } from "@/lib/publish/config";
import { type PublishPayload, publishedUrl, standaloneDocument } from "@/lib/publish/payload";
import { UiIcon as Icon } from "./ui-icon";

type View = { key: string; label: string; lang?: Lang };

/**
 * Shows exactly what publishing produces: the HTML string per language, and the
 * JSON envelope that gets POSTed. Opening this does not require the backend to
 * be running — the payload is built locally — so the output is always
 * inspectable.
 */
export function PublishPanel({
  payload,
  published,
  onClose,
}: {
  payload: PublishPayload;
  /** True when this payload was accepted by the publish API. */
  published: boolean;
  onClose: () => void;
}) {
  const views = useMemo<View[]>(() => {
    const langs = Object.keys(payload.locales) as Lang[];
    return [
      ...langs.map((l) => ({ key: `html-${l}`, label: `HTML · ${l.toUpperCase()}`, lang: l })),
      { key: "css", label: "CSS" },
      { key: "json", label: "JSON payload" },
    ];
  }, [payload]);

  const [view, setView] = useState<string>(views[0]?.key ?? "json");
  const active = views.find((v) => v.key === view) ?? views[0];

  const code = useMemo(() => {
    if (!active) return "";
    if (active.key === "json") return JSON.stringify(payload, null, 2);
    if (active.key === "css") return payload.css;
    return active.lang ? (payload.locales[active.lang]?.html ?? "") : "";
  }, [active, payload]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Clipboard blocked by the browser");
    }
  };

  const download = () => {
    const lang = active?.lang;
    const isDoc = Boolean(lang);
    const content = lang ? standaloneDocument(payload, lang) : code;
    const ext = active?.key === "json" ? "json" : active?.key === "css" ? "css" : "html";
    const name = `${payload.slug}${lang ? `-${lang}` : ""}.${ext}`;

    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${name}`, {
      description: isDoc ? "Standalone document — CSS inlined in <head>" : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-900/60">
      <div className="flex h-14 shrink-0 items-center justify-between gap-4 bg-background px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-sm font-semibold">Publish output</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              published
                ? "bg-emerald-100 text-emerald-800"
                : "bg-neutral-surface text-muted-foreground",
            )}
          >
            {published ? "Live on mock API" : "Not published yet"}
          </span>
          <code className="truncate text-[11px] text-muted-foreground">
            {PUBLISH_API}/api/pages/{payload.slug}
          </code>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground"
        >
          Close
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-neutral-surface p-4">
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-2xl bg-background shadow-lift">
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <div className="flex rounded-lg bg-neutral-surface p-1">
              {views.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setView(v.key)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                    view === v.key
                      ? "bg-background text-brand shadow-panel"
                      : "text-muted-foreground",
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <span className="ms-auto text-[11px] tabular-nums text-muted-foreground">
              {code.length.toLocaleString()} chars
            </span>

            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-neutral-surface"
            >
              <Icon name="Copy" className="size-3.5" /> Copy
            </button>
            <button
              type="button"
              onClick={download}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-neutral-surface"
            >
              <Icon name="Download" className="size-3.5" /> Download
            </button>
            {published && active?.lang && (
              <a
                href={publishedUrl(payload.slug, active.lang)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-strong"
              >
                <Icon name="ExternalLink" className="size-3.5" /> Open published page
              </a>
            )}
          </div>

          <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all bg-neutral-950 p-4 text-[11px] leading-relaxed text-neutral-200">
            <code>{code}</code>
          </pre>

          <div className="shrink-0 border-t border-border px-4 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
            The website receives <code className="font-semibold">html</code> as an HTML fragment and
            builds <code className="font-semibold">&lt;head&gt;</code> from{" "}
            <code className="font-semibold">seo</code>. The fragment contains no JavaScript —
            interactivity is CSS-only or delegated via{" "}
            <code className="font-semibold">data-fs-*</code> attributes.
          </div>
        </div>
      </div>
    </div>
  );
}
