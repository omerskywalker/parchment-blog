"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { qk } from "@/lib/queryKeys";
import {
  fetchPost,
  updatePost,
  deletePost,
  setPostPublished,
  PublishPostResponse,
  MyPostsResponse,
  PostDetail,
} from "@/lib/api/posts";
import { formatScheduledPublishDate } from "@/lib/schedule";
import { wordCount } from "@/lib/wordCount";
import { formatAutoSaveStatus, type AutoSaveStatus } from "@/lib/editorStatus";
import { useUnsavedWarning } from "@/lib/hooks/useUnsavedWarning";
import { useDebounce } from "@/lib/hooks/useDebounce";

import MarkdownEditor from "@/app/components/editor/MarkdownEditor";
import TagPillInput from "@/app/components/editor/TagPillInput";
import Markdown from "@/app/components/Markdown";
import DeleteConfirmModal from "@/app/components/DeleteConfirmModal";
import { EditorSkeleton } from "@/app/components/skeletons/EditorSkeleton";

/** Extract the YYYY-MM-DD portion from a stored UTC ISO string for a date input. */
function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

export default function EditPostPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const params = useParams<{ id?: string }>();
  const id = params?.id;

  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [contentMd, setContentMd] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = React.useState<string | null>(null);
  const [scheduleInput, setScheduleInput] = React.useState(""); // date input value (YYYY-MM-DD)
  const [showScheduler, setShowScheduler] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = React.useState<AutoSaveStatus>("idle");
  const [lastAutoSavedAt, setLastAutoSavedAt] = React.useState<Date | null>(null);
  const [showPreview, setShowPreview] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  // Track the last-saved state to compute isDirty (must be state, not a ref, so render can read it)
  const [savedState, setSavedState] = React.useState({ title: "", slug: "", contentMd: "", tags: "[]" });
  const isDirty =
    title !== savedState.title ||
    slug !== savedState.slug ||
    contentMd !== savedState.contentMd ||
    JSON.stringify(tags) !== savedState.tags;

  useUnsavedWarning(isDirty);

  function applyPublishedAtToCaches(publishedAt: string | null) {
    if (!id) return;

    qc.setQueryData<PostDetail>(qk.post(id), (old) => {
      if (!old?.ok) return old;
      return { ...old, post: { ...old.post, publishedAt } };
    });

    qc.setQueryData<MyPostsResponse>(qk.myPosts(), (old) => {
      if (!old?.ok) return old;
      return {
        ...old,
        posts: old.posts.map((p) => (p.id === id ? { ...p, publishedAt } : p)),
      };
    });
  }

  const postQuery = useQuery({
    queryKey: id ? qk.post(id) : ["post", "missing-id"],
    queryFn: () => fetchPost(id as string),
    enabled: typeof id === "string" && id.length > 0,
    retry: false,
  });

  const didInit = React.useRef(false);

  React.useEffect(() => {
    if (!didInit.current && postQuery.data?.ok) {
      didInit.current = true;
      const p = postQuery.data.post;
      const loadedTags = p.tags ?? [];
      setTitle(p.title);
      setSlug(p.slug);
      setContentMd(p.contentMd);
      setTags(loadedTags);
      setScheduledAt(p.scheduledAt ?? null);
      // Pre-fill scheduler input if a schedule already exists
      if (p.scheduledAt) {
        setScheduleInput(toDateInput(p.scheduledAt));
      }
      setSavedState({
        title: p.title,
        slug: p.slug,
        contentMd: p.contentMd,
        tags: JSON.stringify(loadedTags),
      });
    }
  }, [postQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updatePost(id as string, {
        title: title.trim(),
        slug: slug.trim(),
        contentMd,
        tags,
      }),
    onSuccess: async (res) => {
      if (!res.ok) return setError(res.message ?? "Unable to save.");

      await qc.invalidateQueries({ queryKey: qk.myPosts() });
      await qc.invalidateQueries({ queryKey: qk.post(id as string) });

      setError(null);
      router.push("/dashboard/posts");
    },
    onError: () => setError("Something went wrong."),
  });

  const autoSaveMutation = useMutation({
    mutationFn: () =>
      updatePost(id as string, {
        title: title.trim(),
        slug: slug.trim(),
        contentMd,
        tags,
      }),
    onMutate: () => setAutoSaveStatus("saving"),
    onSuccess: (res) => {
      if (res.ok) {
        setAutoSaveStatus("saved");
        setLastAutoSavedAt(new Date());
        setSavedState({ title: title.trim(), slug: slug.trim(), contentMd, tags: JSON.stringify(tags) });
      }
    },
    onError: () => setAutoSaveStatus("error"),
  });

  useDebounce(
    () => {
      if (!id || !didInit.current || !isDirty || saveMutation.isPending || autoSaveMutation.isPending) return;
      autoSaveMutation.mutate();
    },
    3000,
    [title, slug, contentMd, tags],
  );

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(id as string),
    onSuccess: async (res) => {
      if (!res.ok) return setError(res.message ?? "Unable to delete.");

      await qc.invalidateQueries({ queryKey: qk.myPosts() });

      router.push("/dashboard/posts");
    },
    onError: () => setError("Something went wrong."),
  });

  type PublishCtx = {
    prevList: MyPostsResponse | undefined;
    prevPost: PostDetail | undefined;
  };

  const publishMutation = useMutation<PublishPostResponse, Error, boolean, PublishCtx>({
    mutationFn: (published) => setPostPublished(id as string, published),

    onMutate: async (published) => {
      setError(null);

      await qc.cancelQueries({ queryKey: qk.myPosts() });
      await qc.cancelQueries({ queryKey: qk.post(id as string) });

      const prevList = qc.getQueryData<MyPostsResponse>(qk.myPosts());
      const prevPost = qc.getQueryData<PostDetail>(qk.post(id as string));

      const optimisticPublishedAt = published ? new Date().toISOString() : null;
      applyPublishedAtToCaches(optimisticPublishedAt);

      return { prevList, prevPost };
    },

    onError: (_err, _published, ctx) => {
      if (ctx?.prevList !== undefined) qc.setQueryData(qk.myPosts(), ctx.prevList);
      if (ctx?.prevPost !== undefined) qc.setQueryData(qk.post(id as string), ctx.prevPost);
      setError("Something went wrong.");
    },

    onSuccess: (res) => {
      if (!res.ok) {
        setError(res.message ?? "Unable to update publish state.");
        return;
      }
      applyPublishedAtToCaches(res.post.publishedAt);
    },

    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: qk.myPosts() });
      await qc.invalidateQueries({ queryKey: qk.post(id as string) });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: (isoDate: string | null) =>
      updatePost(id as string, { scheduledAt: isoDate }),
    onSuccess: (res) => {
      if (!res.ok) return setError(res.message ?? "Unable to update schedule.");
      const next = res.post.scheduledAt ?? null;
      setScheduledAt(next);
      if (next) setScheduleInput(toDateInput(next));
      setShowScheduler(false);
      qc.invalidateQueries({ queryKey: qk.post(id as string) });
    },
    onError: () => setError("Failed to update schedule."),
  });

  if (!id) {
    return (
      <main className="mx-auto max-w-[845px] px-4 py-10">
        <p className="text-white/70">Missing post id.</p>
        <div className="mt-4">
          <Link
            href="/dashboard/posts"
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
          >
            ← Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const { data, isPending } = postQuery;

  if (isPending) {
    return <EditorSkeleton />;
  }

  if (!data || !data.ok) {
    return (
      <main className="mx-auto max-w-[845px] px-4 py-10">
        <p className="text-white/70">{data?.message ?? "Unable to load post."}</p>
        <div className="mt-4">
          <Link
            href="/dashboard/posts"
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
          >
            ← Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const isPublished = Boolean(data.post.publishedAt);
  const isScheduled = Boolean(scheduledAt) && !isPublished;
  const wc = wordCount(contentMd);
  const autoSaveMessage = formatAutoSaveStatus(autoSaveStatus, lastAutoSavedAt);
  const formattedSchedule = scheduledAt ? formatScheduledPublishDate(scheduledAt) : null;
  const anyPending =
    deleteMutation.isPending ||
    publishMutation.isPending ||
    saveMutation.isPending ||
    scheduleMutation.isPending;

  return (
    <main className="mx-auto max-w-[845px] px-4 py-10">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/posts"
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
        >
          ← Back to posts
        </Link>

        <button
          onClick={() => setShowDeleteModal(true)}
          disabled={anyPending}
          className="rounded-md border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-sm text-red-200 transition-colors hover:bg-red-500/15 disabled:opacity-60"
        >
          {deleteMutation.isPending ? "Deleting…" : "Delete"}
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Edit post</h1>

          <span
            className={[
              "rounded-full px-2.5 py-1 text-xs",
              isPublished
                ? "bg-emerald-500/15 text-emerald-200"
                : isScheduled
                  ? "bg-blue-500/15 text-blue-200"
                  : "bg-white/10 text-white/70",
            ].join(" ")}
          >
            {isPublished ? "Published" : isScheduled ? "Scheduled" : "Draft"}
          </span>

          {isPublished && data.post.publishedAt ? (
            <p className="text-xs text-white/50">
              Published{" "}
              {new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "short",
                day: "2-digit",
              }).format(new Date(data.post.publishedAt))}
            </p>
          ) : isScheduled && scheduledAt ? (
            <p className="text-xs text-white/50">
              Scheduled for{" "}
              {formattedSchedule?.utcDate}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Schedule toggle — only for unpublished posts */}
          {!isPublished && (
            <button
              type="button"
              onClick={() => setShowScheduler((v) => !v)}
              disabled={anyPending}
              className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 disabled:opacity-60"
            >
              {isScheduled ? "Edit schedule" : "Schedule"}
            </button>
          )}

          <button
            onClick={() => {
              setError(null);
              publishMutation.mutate(!isPublished);
            }}
            disabled={anyPending}
            className="rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/90 transition-colors hover:bg-[rgba(127,127,127,0.12)] disabled:opacity-60"
          >
            {publishMutation.isPending ? "Updating…" : isPublished ? "Unpublish" : "Publish now"}
          </button>
        </div>
      </div>

      {/* Schedule panel — only for unpublished posts */}
      {showScheduler && !isPublished && (
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
          <div>
            <label className="text-xs text-white/60">Publish date</label>
            <input
              type="date"
              value={scheduleInput}
              onChange={(e) => setScheduleInput(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="mt-1 block rounded-md border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white outline-none focus:border-white/30"
            />
            <p className="mt-1.5 text-xs text-white/40">
              Posts go live at 9:00 AM UTC on the selected date.
            </p>
            <p className="mt-1 text-xs text-white/35">
              That is {scheduleInput ? formatScheduledPublishDate(`${scheduleInput}T09:00:00.000Z`).localDateTime : "shown in your local timezone after you pick a date"}.
            </p>
            {formattedSchedule && isScheduled ? (
              <p className="mt-1 text-xs text-white/35">
                Current schedule: {formattedSchedule.utcDateTime} ({formattedSchedule.localDateTime} local)
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 pb-0.5">
            <button
              type="button"
              disabled={scheduleMutation.isPending || !scheduleInput}
              onClick={() => {
                if (!scheduleInput) return;
                // Store as 9 AM UTC on the chosen date (matches daily cron schedule)
                scheduleMutation.mutate(`${scheduleInput}T09:00:00.000Z`);
              }}
              className="rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/90 disabled:opacity-60"
            >
              {scheduleMutation.isPending ? "Saving…" : "Set schedule"}
            </button>
            {isScheduled && (
              <button
                type="button"
                disabled={scheduleMutation.isPending}
                onClick={() => scheduleMutation.mutate(null)}
                className="rounded-md px-3 py-1.5 text-sm text-white/50 hover:text-white/80 disabled:opacity-60"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            saveMutation.mutate();
          }}
          className="space-y-5"
        >
          <div>
            <label className="text-sm font-medium text-white">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-white/20"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-white/20"
              required
            />
            {slug ? (
              <p className="mt-1.5 text-xs text-white/40">
                URL: /posts/<span className="text-white/60">{slug}</span>
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-medium text-white">
              Tags <span className="text-white/50">(optional)</span>
            </label>
            <TagPillInput tags={tags} onChange={setTags} />
            <p className="mt-1.5 text-xs text-white/40">Press Enter or comma to add a tag.</p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white">Content</label>
              <div className="flex items-center gap-1 rounded-md border border-white/10 bg-black/30 p-0.5">
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className={[
                    "rounded px-3 py-1.5 text-xs transition-colors",
                    !showPreview ? "bg-white/10 text-white" : "text-white/50 hover:text-white/70",
                  ].join(" ")}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className={[
                    "rounded px-3 py-1.5 text-xs transition-colors",
                    showPreview ? "bg-white/10 text-white" : "text-white/50 hover:text-white/70",
                  ].join(" ")}
                >
                  Preview
                </button>
              </div>
            </div>

            {showPreview ? (
              <div className="mt-2 min-h-[420px] overflow-auto rounded-md border border-white/10 bg-black/30 px-5 py-4">
                {contentMd.trim() ? (
                  <Markdown content={contentMd} />
                ) : (
                  <p className="text-sm text-white/30">Nothing to preview yet.</p>
                )}
              </div>
            ) : (
              <MarkdownEditor value={contentMd} onChange={setContentMd} minHeight={420} />
            )}

            <p className="mt-1.5 text-right text-xs text-white/30">
              {wc} {wc === 1 ? "word" : "words"}
            </p>
          </div>

          {autoSaveMessage && (
            <p
              className={[
                "text-right text-xs",
                autoSaveStatus === "error" ? "text-red-300" : "text-white/30",
              ].join(" ")}
            >
              {autoSaveMessage}
            </p>
          )}

          {error ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={anyPending}
              className="rounded-md border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[rgba(127,127,127,0.12)] disabled:opacity-60"
            >
              {saveMutation.isPending ? "Saving…" : "Save & exit"}
            </button>
          </div>
        </form>
      </section>
      {showDeleteModal && (
        <DeleteConfirmModal
          isDeleting={deleteMutation.isPending}
          onConfirm={() => {
            setError(null);
            deleteMutation.mutate();
          }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </main>
  );
}
