"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createPost } from "@/lib/api/posts";
import { qk } from "@/lib/queryKeys";

type FormState = {
  title: string;
  contentMd: string;
  slug: string;
};

export default function NewPostPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = React.useState<FormState>({
    title: "",
    contentMd: "",
    slug: "",
  });

  const [formError, setFormError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createPost,
    onSuccess: async (data) => {
      if (!data.ok) {
        setFormError(data.message ?? "Unable to create post.");
        return;
      }

      // mark list stale so /dashboard/posts refetches
      await queryClient.invalidateQueries({ queryKey: qk.myPosts() });

      // redirect back to list
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

    // lightweight client-side guardrails (server will still validate)
    if (!form.title.trim()) return setFormError("Title is required.");
    if (form.contentMd.trim().length < 1) return setFormError("Content cannot be empty.");

    mutation.mutate({
      title: form.title.trim(),
      contentMd: form.contentMd,
      slug: form.slug.trim() ? form.slug.trim() : undefined,
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {/* top row: back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/posts"
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
        >
          ← Back to posts
        </Link>
      </div>

      {/* page header */}
      <div className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">New post</h1>
        <p className="mt-1 text-sm text-white/50">Create a draft. You can publish later.</p>
      </div>

      {/* form card */}
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

          {/* slug (optional) */}
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
            <p className="mt-2 text-xs text-white/50">
              Leave blank to auto-generate from the title.
            </p>
          </div>

          {/* content */}
          <div>
            <label className="text-sm font-medium text-white">Content</label>
            <textarea
              value={form.contentMd}
              onChange={(e) => update("contentMd", e.target.value)}
              className="mt-2 min-h-55 w-full resize-y rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-white/20"
              placeholder="Write in Markdown..."
              required
            />
          </div>

          {/* error */}
          {formError ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {formError}
            </div>
          ) : null}

          {/* actions */}
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
