"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createPost, setPostPublished } from "@/lib/api/posts";
import { fetchMyProfile } from "@/lib/api/profile";
import { qk } from "@/lib/queryKeys";
import { hasNewPostDraftContent } from "@/lib/drafts";
import { slugify } from "@/lib/validators/posts";
import { wordCount } from "@/lib/wordCount";
import { useUnsavedWarning } from "@/lib/hooks/useUnsavedWarning";
import { useLocalDraft } from "@/lib/hooks/useLocalDraft";
import MarkdownEditor from "@/app/components/editor/MarkdownEditor";
import TagPillInput from "@/app/components/editor/TagPillInput";
import Markdown from "@/app/components/Markdown";
import AutoPublishToast from "@/app/components/AutoPublishToast";

type FormState = {
  title: string;
  contentMd: string;
  slug: string;
  tags: string[];
};

export default function NewPostPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = React.useState<FormState>({
    title: "",
    contentMd: "",
    slug: "",
    tags: [],
  });

  const [formError, setFormError] = React.useState<string | null>(null);
  const [showPreview, setShowPreview] = React.useState(false);
  const [autoPublishedPostId, setAutoPublishedPostId] = React.useState<string | null>(null);
  const [showRecoveredDraft, setShowRecoveredDraft] = React.useState(false);

  const isDirty = hasNewPostDraftContent(form);
  useUnsavedWarning(isDirty);

  // Load user's autoPublish preference
  const profileQuery = useQuery({
    queryKey: ["me-profile"],
    queryFn: fetchMyProfile,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
  });
  const autoPublish = profileQuery.data?.ok ? profileQuery.data.user.autoPublish : true;

  const undoPublish = useMutation({
    mutationFn: (postId: string) => setPostPublished(postId, false),
    onSuccess: (res, postId) => {
      if (!res.ok) return;
      setAutoPublishedPostId(null);
      router.push(`/dashboard/posts/${postId}/edit`);
    },
  });

  const mutation = useMutation({
    mutationFn: createPost,
    onSuccess: async (data) => {
      if (!data.ok) {
        setFormError(data.message ?? "Unable to create post.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: qk.myPosts() });
      clearDraft();

      if (data.post.publishedAt) {
        // Auto-published: show undo toast, then navigate to posts list
        setAutoPublishedPostId(data.post.id);
        router.push("/dashboard/posts");
      } else {
        router.push("/dashboard/posts");
      }
    },
    onError: () => {
      setFormError("Something went wrong. Please try again.");
    },
  });

  const DRAFT_KEY = "parchment:draft:new";

  const { clear: clearDraft } = useLocalDraft(
    DRAFT_KEY,
    form,
    (saved) => {
      setForm((current) => {
        const isEmpty = !hasNewPostDraftContent(current);
        const restoredDraft = saved as typeof form;

        if (isEmpty && hasNewPostDraftContent(restoredDraft)) {
          setShowRecoveredDraft(true);
          return restoredDraft;
        }

        return current;
      });
    },
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.title.trim()) return setFormError("Title is required.");
    if (form.contentMd.trim().length < 1) return setFormError("Content cannot be empty.");

    mutation.mutate({
      title: form.title.trim(),
      contentMd: form.contentMd,
      slug: form.slug.trim() ? form.slug.trim() : undefined,
      tags: form.tags,
    });
  }

  const slugPreview = form.slug.trim() ? form.slug.trim() : slugify(form.title);
  const wc = wordCount(form.contentMd);

  return (
    <main className="mx-auto max-w-[845px] px-4 py-10">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/posts"
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
        >
          ← Back to posts
        </Link>
      </div>

      <div className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">New post</h1>
        <p className="mt-1 text-sm text-white/50">
          {autoPublish
            ? "Auto-publish is on — your post goes live when you save."
            : "Create a draft. You can publish later."}
        </p>
      </div>

      {/* Auto-publish banner.
          Single row at every width: status indicator on the left,
          "Change" as a clickable pill on the right. The descriptive
          subtext ("your post goes live when you save") was already
          shown by the page subtitle above, so dropping it from the
          banner removes the redundancy that forced wrapping at iPhone
          widths and lets everything sit comfortably on one line. */}
      {autoPublish && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span aria-hidden className="h-2 w-2 flex-shrink-0 rounded-full bg-emerald-400" />
            <span className="truncate text-sm font-medium text-emerald-200">
              Auto-publish on
            </span>
          </div>
          <Link
            href="/dashboard/profile?next=%2Fdashboard%2Fposts%2Fnew"
            className="inline-flex flex-shrink-0 items-center rounded-full border border-emerald-500/30 px-3 py-1 text-xs font-medium text-emerald-200/90 transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/10 hover:text-emerald-100"
          >
            Change
          </Link>
        </div>
      )}

      {showRecoveredDraft && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-sky-500/20 bg-sky-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-sky-100">Recovered your unsaved draft</p>
            <p className="mt-1 text-xs text-white/50">
              We restored the last draft saved in this browser for this new-post page.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowRecoveredDraft(false)}
              className="rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/85 transition-colors hover:bg-white/15"
            >
              Keep draft
            </button>
            <button
              type="button"
              onClick={() => {
                setForm({
                  title: "",
                  contentMd: "",
                  slug: "",
                  tags: [],
                });
                clearDraft();
                setShowRecoveredDraft(false);
              }}
              className="rounded-md px-3 py-1.5 text-xs text-white/55 transition-colors hover:text-white/80"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-6">
        <form onSubmit={onSubmit} className="space-y-5">
          {/* title */}
          <div>
            <label className="text-sm font-medium text-white">Title</label>
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-white/20"
              placeholder="e.g. My first post"
              autoFocus
              required
            />
          </div>

          {/* slug */}
          <div>
            <label className="text-sm font-medium text-white">
              Slug <span className="text-white/50">(optional)</span>
            </label>
            <input
              value={form.slug}
              onChange={(e) => update("slug", e.target.value)}
              className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-white/20"
              placeholder="e.g. my-first-post"
            />
            {slugPreview ? (
              <p className="mt-1.5 text-xs text-white/40">
                URL: /posts/<span className="text-white/60">{slugPreview}</span>
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-white/40">Leave blank to auto-generate from the title.</p>
            )}
          </div>

          {/* tags */}
          <div>
            <label className="text-sm font-medium text-white">
              Tags <span className="text-white/50">(optional)</span>
            </label>
            <TagPillInput
              tags={form.tags}
              onChange={(tags) => update("tags", tags)}
            />
            <p className="mt-1.5 text-xs text-white/40">Press Enter or comma to add a tag.</p>
          </div>

          {/* content + preview toggle */}
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
              <div className="mt-2 min-h-[360px] overflow-auto rounded-md border border-white/10 bg-black/30 px-5 py-4">
                {form.contentMd.trim() ? (
                  <Markdown content={form.contentMd} />
                ) : (
                  <p className="text-sm text-white/30">Nothing to preview yet.</p>
                )}
              </div>
            ) : (
              <MarkdownEditor
                value={form.contentMd}
                onChange={(value) => update("contentMd", value)}
                minHeight={360}
              />
            )}

            <p className="mt-1.5 text-right text-xs text-white/30">
              {wc} {wc === 1 ? "word" : "words"}
            </p>
          </div>

          {formError ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {formError}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <Link
              href="/dashboard/posts"
              onClick={() => clearDraft()}
              className="rounded-md px-3 py-2 text-sm text-white/70 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-md border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[rgba(127,127,127,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending
                ? autoPublish
                  ? "Publishing…"
                  : "Creating…"
                : autoPublish
                  ? "Save & publish"
                  : "Create draft"}
            </button>
          </div>
        </form>
      </section>

      {/* Undo toast — shown after successful auto-publish, before navigation completes */}
      {autoPublishedPostId && (
        <AutoPublishToast
          postId={autoPublishedPostId}
          onUndo={() => undoPublish.mutate(autoPublishedPostId)}
          onDismiss={() => setAutoPublishedPostId(null)}
        />
      )}
    </main>
  );
}
