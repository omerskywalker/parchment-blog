"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createPost } from "@/lib/api/posts";
import { qk } from "@/lib/queryKeys";
import { slugify } from "@/lib/validators/posts";
import { wordCount } from "@/lib/wordCount";
import { useUnsavedWarning } from "@/lib/hooks/useUnsavedWarning";
import MarkdownEditor from "@/app/components/editor/MarkdownEditor";
import TagPillInput from "@/app/components/editor/TagPillInput";
import Markdown from "@/app/components/Markdown";

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

  const isDirty = form.title !== "" || form.contentMd !== "" || form.slug !== "" || form.tags.length > 0;
  useUnsavedWarning(isDirty);

  const mutation = useMutation({
    mutationFn: createPost,
    onSuccess: async (data) => {
      if (!data.ok) {
        setFormError(data.message ?? "Unable to create post.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: qk.myPosts() });
      router.push("/dashboard/posts");
    },
    onError: () => {
      setFormError("Something went wrong. Please try again.");
    },
  });

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
    <main className="4py-10">
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
        <p className="mt-1 text-sm text-white/50">Create a draft. You can publish later.</p>
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6">
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
                    "rounded px-2.5 py-1 text-xs transition-colors",
                    !showPreview ? "bg-white/10 text-white" : "text-white/50 hover:text-white/70",
                  ].join(" ")}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className={[
                    "rounded px-2.5 py-1 text-xs transition-colors",
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
              className="rounded-md px-3 py-2 text-sm text-white/70 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-md border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[rgba(127,127,127,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? "Creating…" : "Create draft"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
