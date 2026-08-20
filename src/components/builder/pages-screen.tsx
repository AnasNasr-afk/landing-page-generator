import type { PageSummary } from "@/lib/page-api";
import type { Lang } from "@/lib/builder-types";
import { LucideIcon } from "./renderer";
import { Pill } from "./controls";

export function PagesScreen({
  pages,
  loading,
  opening,
  deleting,
  onOpen,
  onDelete,
  onRefresh,
}: {
  pages: PageSummary[];
  loading: boolean;
  opening: string | null;
  deleting: string | null;
  onOpen: (page: PageSummary) => void;
  onDelete: (page: PageSummary) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Published pages</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Open a published page in the builder, make changes, and publish it again to the same
            URL.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-neutral-surface"
        >
          <LucideIcon name="RefreshCw" className="size-3.5" /> Refresh
        </button>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading published pages…</p>
      ) : pages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
          <p className="text-sm font-semibold">No published pages yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Publish a page and it will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <PageCard
              key={page.slug}
              page={page}
              opening={opening === page.slug}
              deleting={deleting === page.slug}
              onOpen={onOpen}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PageCard({
  page,
  opening,
  deleting,
  onOpen,
  onDelete,
}: {
  page: PageSummary;
  opening: boolean;
  deleting: boolean;
  onOpen: (page: PageSummary) => void;
  onDelete: (page: PageSummary) => void;
}) {
  const date = new Date(page.publishedAt).toLocaleString();
  return (
    <article className="flex min-h-44 flex-col rounded-2xl border border-border bg-background p-5 transition hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{page.name || page.slug}</h2>
          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">/{page.slug}</p>
        </div>
        <Pill tone={page.status === "published" ? "brand" : "muted"}>
          {page.status === "published" ? "Published" : "Draft"}
        </Pill>
      </div>
      <div className="mt-5 space-y-1 text-xs text-muted-foreground">
        <p>Languages: {page.locales.map((lang: Lang) => lang.toUpperCase()).join(", ")}</p>
        <p>Last published: {date}</p>
      </div>
      <div className="mt-auto flex gap-2">
        <button
          type="button"
          disabled={!page.editable || opening || deleting}
          onClick={() => onOpen(page)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-45"
          title={
            page.editable ? "Open this page in the builder" : "Editable source is not available"
          }
        >
          <LucideIcon name={opening ? "LoaderCircle" : "Pencil"} className="size-3.5" />
          {opening ? "Opening…" : page.editable ? "Edit page" : "Not editable"}
        </button>
        <button
          type="button"
          disabled={opening || deleting}
          onClick={() => onDelete(page)}
          className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-destructive hover:border-destructive disabled:cursor-not-allowed disabled:opacity-45"
          title="Delete page"
        >
          <LucideIcon name={deleting ? "LoaderCircle" : "Trash2"} className="size-3.5" />
        </button>
      </div>
    </article>
  );
}
