import { useState } from "react";
import "./cms.css";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminAccess } from "@/admin/access";
import { Card, PageIntro, adminButton, adminInput, Status } from "@/admin/ui";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  HOME_ID,
  contentFields,
  defaultContent,
  homeDefaults,
  text,
  publicContent,
  type Content,
  type ContentDocument,
  type ContentKind,
  type Field,
  type LinkValue,
} from "./content";
import {
  listContent,
  changeContent,
  contentHistory,
  syncArticles,
  beginPdfUpload,
  finishPdfUpload,
  previewPdf,
} from "./actions";
import { HomepageView } from "./HomepageView";
import { CampaignPreview, ContentCard, ContentDetail } from "./PublicViews";
import type { KitPost } from "./kit-content.server";
const names: Record<ContentKind, string> = {
  page: "Pages",
  blog: "Blog",
  video: "Videos",
  webinar: "Webinars",
  resource: "Resources",
  popup: "Popups",
};
function fresh(kind: ContentKind): ContentDocument {
  return {
    id: kind === "page" ? HOME_ID : crypto.randomUUID(),
    kind,
    slug: kind === "page" ? "home" : "",
    title: kind === "page" ? "Homepage" : "",
    draft: defaultContent(kind),
    published: null,
    revision: 0,
    published_revision: 0,
    archived: false,
    source_ref: null,
    updated_at: "",
    published_at: null,
    updated_by: null,
  };
}
function time(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Not yet";
}
function message(error: unknown) {
  return error instanceof Error ? error.message : "The operation failed. Please try again.";
}
export function ContentManager({ kind }: { kind: ContentKind }) {
  const { isAdmin } = useAdminAccess();
  return isAdmin ? (
    <Manager kind={kind} />
  ) : (
    <Card>
      <h2 className="text-xl font-black">Administrator access required</h2>
      <p className="mt-3">
        Website content can be managed only by administrators. Your Snapshot workspace remains
        available.
      </p>
    </Card>
  );
}
function Manager({ kind }: { kind: ContentKind }) {
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ["cms", kind],
    queryFn: async () => {
      const response = await listContent({ data: { kind } });
      if (!response.ok) throw new Error(response.error);
      return response.value;
    },
    retry: false,
  });
  const [editing, setEditing] = useState<ContentDocument | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [archived, setArchived] = useState(false);
  const documents = query.data?.documents ?? [];
  const shown =
    kind === "page" && !documents.length
      ? [fresh("page")]
      : documents.filter((d) => archived || !d.archived);
  const posts = Array.isArray(query.data?.cache?.payload)
    ? (query.data.cache.payload as KitPost[])
    : [];
  const sync = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await syncArticles();
      if (!result.ok) throw new Error(result.error);
      setNotice(
        `Kit synchronized. ${result.value} eligible public articles. New articles are drafts until you publish their display settings.`,
      );
      await cache.invalidateQueries({ queryKey: ["cms", "blog"] });
    } catch (e) {
      setError(message(e));
      await query.refetch();
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageIntro
        description={
          kind === "page"
            ? "Edit the existing Snapshot homepage’s copy and sections. Save a draft, preview it, then publish explicitly. Internal assessment pages are not editable here."
            : kind === "blog"
              ? "Kit remains the article publisher. Sync public, free posts, then choose which ones appear here. These settings never change the original article."
              : kind === "popup"
                ? "Manage marketing announcements. Campaigns never appear in the assessment, results, admin, sign-in or private reports."
                : `Manage ${names[kind].toLowerCase()} using drafts, previews and explicit publication.`
        }
      >
        {kind !== "page" && kind !== "blog" && (
          <button
            className={`${adminButton} bg-navy text-white`}
            onClick={() => {
              setEditing(fresh(kind));
              setNotice("");
            }}
          >
            Add {kind}
          </button>
        )}
      </PageIntro>
      {kind === "blog" && (
        <Card className="mb-6">
          <h2 className="font-black">Kit article connection</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">API configuration</dt>
              <dd>
                {query.data?.kitConfigured
                  ? "Server key configured"
                  : "KIT_API_KEY is not configured in this environment"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last successful sync</dt>
              <dd>{time(query.data?.cache?.last_success_at ?? null)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm">
            Cached articles are rechecked after 15 minutes when the library is used. A temporary
            failure retains the last successful list for up to 24 hours; expired articles are
            withheld.
          </p>
          {query.data?.cache?.last_error && (
            <p className="mt-4 text-destructive" role="alert">
              {query.data.cache.last_error}
            </p>
          )}
          <button
            className={`${adminButton} mt-4`}
            disabled={busy || !query.data?.kitConfigured}
            onClick={() => void sync()}
          >
            {busy ? "Synchronizing…" : "Sync / refresh articles"}
          </button>
        </Card>
      )}
      {(kind === "webinar" || kind === "resource") && (
        <Card className="mb-6">
          <h2 className="font-black">Delivery setup</h2>
          <p className="mt-3 text-sm leading-relaxed">
            Use a dedicated Kit form and its incentive email to deliver this item. Configure and
            test the confirmation, file/recording link, thank-you page and any form automation in
            Kit. The CMS validates the active form and URL before publication. It does not create
            subscribers or trigger emails while you edit.
          </p>
          <p className="mt-3 text-sm leading-relaxed">
            Optional five-day nurture uses a separate signup form. Registrations and subscriber
            totals are managed in Kit; local registration counts are not tracked. Changing the
            featured item does not change earlier Kit registrations or delivery links.
          </p>
        </Card>
      )}
      {notice && (
        <p role="status" className="mb-5 rounded-xl bg-lime/30 p-4 text-sm">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-5 text-destructive">
          {error}
        </p>
      )}
      {query.isPending ? (
        <p role="status">Loading website content…</p>
      ) : query.error ? (
        <Card>
          <h2 className="font-black">Website Content is not ready</h2>
          <p className="mt-3 break-words text-sm" role="alert">
            {query.error.message}
          </p>
          <button className={`${adminButton} mt-4`} onClick={() => void query.refetch()}>
            Check again
          </button>
        </Card>
      ) : (
        <Card>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-black">{names[kind]}</h2>
            {kind !== "page" && (
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={archived}
                  onChange={(e) => setArchived(e.target.checked)}
                />
                Include archived
              </label>
            )}
          </div>
          {!shown.length ? (
            <p className="py-6 text-muted-foreground">
              No items yet.{" "}
              {kind === "blog"
                ? "Sync Kit to import eligible articles."
                : "Add genuine content and save it as a draft."}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {shown.map((doc) => {
                const post = posts.find((p) => p.id === doc.source_ref);
                return (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-start justify-between gap-4 py-5"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-bold">
                        {post?.title || doc.title || "Untitled draft"}
                      </h3>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {kind === "page"
                          ? "/"
                          : kind === "blog"
                            ? (post?.url ?? "Article absent from latest successful Kit sync")
                            : `/${names[kind].toLowerCase()}/${doc.slug || "new-slug"}`}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Updated {time(doc.updated_at || null)} · Revision {doc.revision}
                      </p>
                      {post && (
                        <>
                          {post.thumbnail && (
                            <img
                              className="mt-3 h-20 w-32 rounded-xl object-cover"
                              loading="lazy"
                              src={post.thumbnail}
                              alt={post.alt}
                            />
                          )}
                          <p className="mt-2 text-xs">
                            Published on Kit {time(post.date)} ·{" "}
                            {doc.draft["featured"] ? "Featured" : "Standard"} ·{" "}
                            {doc.draft["visible"] ? "Visible when published" : "Hidden"}
                          </p>
                          <a
                            className="mt-2 inline-flex min-h-11 items-center text-sm underline"
                            href={post.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open original Kit article ↗
                          </a>
                        </>
                      )}
                      {["video", "webinar", "resource"].includes(kind) && (
                        <p className="mt-2 text-xs">
                          {doc.draft["featured"] ? "Featured" : "Standard"} · Display order{" "}
                          {Number(doc.draft["order"] ?? 0)}
                        </p>
                      )}
                      {kind === "webinar" && text(doc.draft, "formUrl") && (
                        <p className="mt-2 break-all text-xs">
                          Kit registration: {text(doc.draft, "formUrl")} · Registrations managed in
                          Kit
                        </p>
                      )}
                      {kind === "popup" && (
                        <p className="mt-2 break-all text-xs">
                          {text(doc.draft, "mode")} · {text(doc.draft, "campaignState")} ·{" "}
                          {text(doc.draft, "ctaHref")}
                        </p>
                      )}
                    </div>
                    <Status>
                      {doc.archived ? "archived" : doc.published ? "published" : "draft"}
                    </Status>
                    <button
                      className={adminButton}
                      onClick={() => {
                        setEditing({ ...doc, draft: { ...defaultContent(kind), ...doc.draft } });
                        setNotice("");
                      }}
                    >
                      Edit / preview
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
      {editing && (
        <Editor
          key={editing.id}
          document={editing}
          post={posts.find((p) => p.id === editing.source_ref)}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await cache.invalidateQueries({ queryKey: ["cms", kind] });
          }}
        />
      )}
    </>
  );
}
function FieldEditor({
  field,
  value,
  onChange,
  disabled,
}: {
  field: Field;
  value: Content[string];
  onChange: (v: Content[string]) => void;
  disabled: boolean;
}) {
  const id = `cms-${field.key}`;
  const str = typeof value === "string" ? value : "";
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const upload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      if (file.type !== "application/pdf") throw new Error("Choose a PDF file.");
      const start = await beginPdfUpload({ data: { filename: file.name, size: file.size } });
      if (!start.ok) throw new Error(start.error);
      const sent = await supabase.storage
        .from("website-resources")
        .uploadToSignedUrl(start.value.path, start.value.token, file, {
          contentType: "application/pdf",
        });
      if (sent.error) throw new Error("PDF upload failed. Please try again.");
      const finish = await finishPdfUpload({ data: { id: start.value.id } });
      if (!finish.ok) throw new Error(finish.error);
      onChange(finish.value.id);
    } catch (e) {
      setError(message(e));
    } finally {
      setUploading(false);
    }
  };
  if (field.type === "toggle")
    return (
      <div>
        <label className="flex min-h-11 items-center gap-3 font-semibold">
          <input
            id={id}
            type="checkbox"
            disabled={disabled}
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="h-5 w-5"
          />
          {field.label}
        </label>
        {field.help && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{field.help}</p>
        )}
      </div>
    );
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-bold">
        {field.label}
        {field.required ? " *" : ""}
      </label>
      {field.help && (
        <p id={`${id}-help`} className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {field.help}
        </p>
      )}
      {field.type === "links" ? (
        <div className="mt-2 space-y-3">
          {(Array.isArray(value) ? (value as LinkValue[]) : []).map((link, n) => (
            <div key={n} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_1.4fr_auto]">
              <input
                aria-label={`${field.label} ${n + 1} label`}
                className={adminInput}
                value={link.label}
                disabled={disabled}
                onChange={(e) =>
                  onChange(
                    (value as LinkValue[]).map((l, i) =>
                      i === n ? { ...l, label: e.target.value } : l,
                    ),
                  )
                }
              />
              <input
                aria-label={`${field.label} ${n + 1} destination`}
                className={adminInput}
                value={link.href}
                disabled={disabled}
                onChange={(e) =>
                  onChange(
                    (value as LinkValue[]).map((l, i) =>
                      i === n ? { ...l, href: e.target.value } : l,
                    ),
                  )
                }
              />
              <button
                className={adminButton}
                disabled={disabled}
                onClick={() => onChange((value as LinkValue[]).filter((_, i) => i !== n))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            className={adminButton}
            disabled={disabled || (value as LinkValue[]).length >= 12}
            onClick={() => onChange([...(value as LinkValue[]), { label: "New link", href: "/" }])}
          >
            Add link
          </button>
        </div>
      ) : field.type === "pdf" ? (
        <div className="mt-2 space-y-3">
          <input
            id={id}
            type="file"
            accept="application/pdf,.pdf"
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <p className="break-all text-xs">
            {uploading
              ? "Uploading and verifying PDF…"
              : str
                ? `Verified file ID: ${str}`
                : "No PDF uploaded"}
          </p>
          {str && (
            <div className="flex flex-wrap gap-3">
              <button
                className={adminButton}
                disabled={disabled || uploading}
                onClick={() => {
                  void previewPdf({ data: { id: str } })
                    .then((result) => {
                      if (result.ok) window.location.assign(result.value);
                      else setError(result.error);
                    })
                    .catch((e) => setError(message(e)));
                }}
              >
                Download private PDF
              </button>
              <button
                className={adminButton}
                disabled={disabled || uploading}
                onClick={() => onChange("")}
              >
                Remove from draft
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
        </div>
      ) : field.type === "select" ? (
        <select
          id={id}
          value={str}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`${adminInput} mt-2`}
        >
          {field.options?.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : field.type === "list" ? (
        <ListField
          id={id}
          label={field.label}
          value={value as string[]}
          onChange={onChange}
          disabled={disabled}
        />
      ) : field.type === "textarea" ? (
        <textarea
          id={id}
          value={str}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.max}
          rows={4}
          className={`${adminInput} mt-2`}
          aria-describedby={field.help ? `${id}-help` : undefined}
        />
      ) : (
        <input
          id={id}
          type={field.type === "number" ? "number" : "text"}
          value={field.type === "number" ? Number(value) : str}
          disabled={disabled}
          onChange={(e) =>
            onChange(field.type === "number" ? Number(e.target.value) : e.target.value)
          }
          maxLength={field.max}
          min={field.type === "number" ? 0 : undefined}
          className={`${adminInput} mt-2`}
          aria-describedby={field.help ? `${id}-help` : undefined}
        />
      )}
      {field.max && (
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {str.length}/{field.max}
        </p>
      )}
    </div>
  );
}
function ListField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  disabled: boolean;
}) {
  return (
    <div id={id} className="mt-2 space-y-2">
      {value.map((line, n) => (
        <div className="flex gap-2" key={n}>
          <input
            aria-label={`${label} ${n + 1}`}
            className={adminInput}
            value={line}
            disabled={disabled}
            onChange={(e) => onChange(value.map((v, i) => (i === n ? e.target.value : v)))}
          />
          <button
            className={adminButton}
            disabled={disabled}
            onClick={() => onChange(value.filter((_, i) => i !== n))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        className={adminButton}
        disabled={disabled || value.length >= 20}
        onClick={() => onChange([...value, ""])}
      >
        Add item
      </button>
    </div>
  );
}
function Editor({
  document,
  post,
  onClose,
  onSaved,
}: {
  document: ContentDocument;
  post?: KitPost | undefined;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [doc, setDoc] = useState(document);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    action: "publish" | "unpublish" | "archive" | "restore" | "discard";
    restore?: string | undefined;
  } | null>(null);
  const history = useQuery({
    queryKey: ["cms-history", doc.id, doc.revision],
    enabled: historyOpen && doc.revision > 0,
    queryFn: async () => {
      const response = await contentHistory({ data: { id: doc.id } });
      if (!response.ok) throw new Error(response.error);
      return response.value;
    },
    retry: false,
  });
  const update = (key: string, value: Content[string]) => {
    setDoc((d) => ({
      ...d,
      draft: { ...d.draft, [key]: value },
      ...(key === "title" ? { title: typeof value === "string" ? value : d.title } : {}),
    }));
    setDirty(true);
    setNotice("");
  };
  const run = async (
    action: "save" | "publish" | "unpublish" | "archive" | "restore",
    restore?: string,
    confirmed = false,
  ) => {
    if (action !== "save" && !confirmed) {
      setConfirmation({ action, restore });
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await changeContent({
        data: {
          id: doc.id,
          kind: doc.kind,
          slug: doc.slug,
          title: doc.title,
          draft: doc.draft,
          expected: doc.revision,
          action,
          ...(restore ? { restore } : {}),
        },
      });
      if (!result.ok) throw new Error(result.error);
      setDoc(result.value);
      setDirty(false);
      setNotice(
        action === "publish"
          ? "Published. New page loads use this version without a deployment."
          : action === "restore"
            ? "Version restored to draft. Preview and publish when ready."
            : action === "save"
              ? "Draft saved. The public website has not changed."
              : "Publication status updated.",
      );
      await onSaved();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const item = {
    id: doc.id,
    kind: doc.kind,
    slug: doc.slug,
    content: publicContent(doc.kind, {
      ...doc.draft,
      ...(post
        ? {
            title: post.title,
            description: post.summary,
            coverUrl: post.thumbnail,
            externalUrl: post.url,
            date: post.date,
          }
        : {}),
    }),
    revision: doc.revision,
    date: doc.published_at,
  };
  const groups = [...new Set(contentFields[doc.kind].map((f) => f.group))];
  const close = () => {
    if (busy) return;
    if (dirty) setConfirmation({ action: "discard" });
    else onClose();
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="cms-dialog admin-portal flex max-h-[94dvh] w-[96vw] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <header className="border-b p-5 pr-12">
          <DialogTitle>Edit {doc.kind === "page" ? "homepage" : doc.kind}</DialogTitle>
          <DialogDescription className="mt-2">
            {doc.published ? `Published revision ${doc.published_revision}. ` : "Not published. "}
            Draft revision {doc.revision}
            {dirty ? " · Unsaved changes" : ""}. Required fields are checked before publication.
          </DialogDescription>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
          {error && (
            <p
              className="rounded-xl border border-destructive p-4 text-sm text-destructive whitespace-pre-wrap break-words"
              role="alert"
            >
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-xl bg-lime/30 p-4 text-sm" role="status">
              {notice}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">
              {doc.kind === "page" ? "Page name" : "Item name"}
              <input
                className={`${adminInput} mt-2`}
                value={doc.title}
                disabled={busy || doc.kind === "blog"}
                maxLength={160}
                onChange={(e) => {
                  setDoc({
                    ...doc,
                    title: e.target.value,
                    ...(doc.kind !== "page"
                      ? { draft: { ...doc.draft, title: e.target.value } }
                      : {}),
                  });
                  setDirty(true);
                }}
              />
            </label>
            <label className="text-sm font-bold">
              Slug{doc.published_revision > 0 ? " (fixed to preserve links)" : ""}
              <input
                className={`${adminInput} mt-2`}
                value={doc.slug}
                disabled={
                  busy || doc.kind === "page" || doc.kind === "blog" || doc.published_revision > 0
                }
                maxLength={80}
                onChange={(e) => {
                  setDoc({ ...doc, slug: e.target.value });
                  setDirty(true);
                }}
              />
            </label>
          </div>
          {groups.map((group, n) => (
            <details key={group} open={n === 0} className="rounded-2xl border p-4">
              <summary className="min-h-8 cursor-pointer font-black">{group}</summary>
              <div className="mt-5 grid gap-6">
                {contentFields[doc.kind]
                  .filter((f) => f.group === group)
                  .map((field) => (
                    <FieldEditor
                      key={field.key}
                      field={field}
                      value={doc.draft[field.key] ?? ""}
                      onChange={(value) => update(field.key, value)}
                      disabled={busy}
                    />
                  ))}
              </div>
            </details>
          ))}
          <button
            className={adminButton}
            disabled={!doc.revision || busy}
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            Published version history
          </button>
          {historyOpen && (
            <section className="rounded-2xl border p-5">
              <h3 className="font-black">Restore a published version to draft</h3>
              {history.isPending ? (
                <p className="mt-3">Loading history…</p>
              ) : history.error ? (
                <p role="alert">{history.error.message}</p>
              ) : !history.data?.length ? (
                <p className="mt-3 text-sm">No published versions yet.</p>
              ) : (
                <ul className="mt-3 divide-y">
                  {history.data?.map((version) => (
                    <li
                      key={version.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                    >
                      <span>
                        Revision {version.revision} · {time(version.created_at)} · {version.action}
                      </span>
                      <button
                        className={adminButton}
                        disabled={busy}
                        onClick={() => void run("restore", version.id)}
                      >
                        Restore to draft
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
        <footer className="flex flex-wrap items-center gap-2 border-t bg-white p-4">
          <button className={adminButton} disabled={busy} onClick={() => void run("save")}>
            Save draft
          </button>
          <button className={adminButton} disabled={busy} onClick={() => setPreview(true)}>
            Preview draft
          </button>
          <button
            className={`${adminButton} bg-navy text-white`}
            disabled={busy}
            onClick={() => void run("publish")}
          >
            {busy ? "Working…" : "Publish"}
          </button>
          {doc.published && (
            <button className={adminButton} disabled={busy} onClick={() => void run("unpublish")}>
              Unpublish
            </button>
          )}
          {doc.kind !== "page" && doc.revision > 0 && !doc.archived && (
            <button className={adminButton} disabled={busy} onClick={() => void run("archive")}>
              Archive
            </button>
          )}
          <button className={`${adminButton} ml-auto`} disabled={busy} onClick={close}>
            Close
          </button>
        </footer>
        {confirmation && (
          <Dialog
            open
            onOpenChange={(open) => {
              if (!open) setConfirmation(null);
            }}
          >
            <DialogContent className="cms-dialog max-w-lg p-6 pr-12">
              <DialogTitle>
                {confirmation.action === "discard"
                  ? "Discard unsaved changes?"
                  : confirmation.action === "publish"
                    ? "Publish to the website?"
                    : confirmation.action === "restore"
                      ? "Restore this version to draft?"
                      : `${confirmation.action === "archive" ? "Archive" : "Unpublish"} this item?`}
              </DialogTitle>
              <DialogDescription>
                {confirmation.action === "discard"
                  ? "Your unsaved edits will be discarded. Saved drafts and public content will stay unchanged."
                  : confirmation.action === "publish"
                    ? "This draft will replace the public version after validation. Visitors will see it on their next page load."
                    : confirmation.action === "restore"
                      ? "This replaces the current draft, including unsaved edits. The live version will stay unchanged until you publish."
                      : "This removes the item from public display and discards unsaved edits. Historical versions, uploaded files and Kit registrations remain."}
              </DialogDescription>
              <div className="mt-4 flex flex-wrap gap-3">
                <button className={adminButton} onClick={() => setConfirmation(null)}>
                  Cancel
                </button>
                <button
                  className={`${adminButton} bg-navy text-white`}
                  onClick={() => {
                    const pending = confirmation;
                    setConfirmation(null);
                    if (pending.action === "discard") onClose();
                    else void run(pending.action, pending.restore, true);
                  }}
                >
                  Confirm {confirmation.action}
                </button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {preview && (
          <Dialog open onOpenChange={setPreview}>
            <DialogContent className="cms-dialog max-h-[94dvh] w-[96vw] max-w-6xl overflow-auto p-0">
              <div className="sticky top-0 z-50 border-b bg-white p-4 pr-12">
                <DialogTitle>Draft preview — not public</DialogTitle>
                <DialogDescription>
                  No emails, registrations or analytics are triggered. Links in the homepage preview
                  lead to existing destinations.
                </DialogDescription>
              </div>
              {doc.kind === "page" ? (
                <HomepageView content={{ ...homeDefaults, ...doc.draft }} />
              ) : doc.kind === "popup" ? (
                <div className="bg-blush p-5">
                  <CampaignPreview item={item} />
                </div>
              ) : doc.kind === "resource" || doc.kind === "webinar" ? (
                <div className="p-5 sm:p-10">
                  <ContentDetail item={item} preview />
                </div>
              ) : (
                <div className="mx-auto max-w-2xl p-5">
                  <ContentCard item={item} preview />
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
