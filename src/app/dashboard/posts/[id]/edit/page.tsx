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
  PostDetail
} from "@/lib/api/posts";
import { parseTagsInput } from "@/lib/tags";


export default function EditPostPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const params = useParams<{ id?: string }>();
  const id = params?.id;

  // hooks must be declared before any conditional returns -- TOP LEVEL
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [contentMd, setContentMd] = React.useState("");
  const [tagsInput, setTagsInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

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
      setTitle(postQuery.data.post.title);
      setSlug(postQuery.data.post.slug);
      setContentMd(postQuery.data.post.contentMd);
      setTagsInput((postQuery.data.post.tags ?? []).join(", "));
    }
  }, [postQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updatePost(id as string, {
        title: title.trim(),
        slug: slug.trim(),
        contentMd,
        tags: parseTagsInput(tagsInput),
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
  

  if (!id) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
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
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-white/70">Loading…</p>
      </main>
    );
  }

  if (!data || !data.ok) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/posts"
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
        >
          ← Back to posts
        </Link>

        <button
          onClick={() => {
            if (!confirm("Delete this post? This cannot be undone.")) return;
            setError(null);
            deleteMutation.mutate();
          }}
          disabled={deleteMutation.isPending || publishMutation.isPending || saveMutation.isPending}
          className="rounded-md border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-sm text-red-200 transition-colors hover:bg-red-500/15 disabled:opacity-60"
        >
          {deleteMutation.isPending ? "Deleting…" : "Delete"}
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Edit post
          </h1>

          <span
            className={[
              "rounded-full px-2.5 py-1 text-xs",
              isPublished
                ? "bg-emerald-500/15 text-emerald-200"
                : "bg-white/10 text-white/70",
            ].join(" ")}
          >
            {isPublished ? "Published" : "Draft"}
          </span>

          {isPublished && data.post.publishedAt ? (
            <p className="text-xs text-white/50">
              Published {new Intl.DateTimeFormat("en-US", {
              year: "numeric",
              month: "short",
              day: "2-digit",
            }).format(new Date(data.post.publishedAt))}
            </p>
          ) : null}
        </div>

        <button
          onClick={() => {
            setError(null);
            publishMutation.mutate(!isPublished);
          }}
          disabled={deleteMutation.isPending || publishMutation.isPending || saveMutation.isPending}
          className="rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white/90 transition-colors hover:bg-[rgba(127,127,127,0.12)] disabled:opacity-60"
        >
          {publishMutation.isPending
            ? "Updating…"
            : isPublished
              ? "Unpublish"
              : "Publish"}
        </button>
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6">
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
          </div>

          <div>
            <label className="text-sm font-medium text-white">
              Tags <span className="text-white/50">(optional)</span>
            </label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-white/20"
              placeholder="e.g. bitcoin, hard-money, dev"
            />
            <p className="mt-2 text-xs text-white/50">
              Comma-separated list of tags.
            </p>
          </div>


          <div>
            <label className="text-sm font-medium text-white">Content</label>
            <textarea
              value={contentMd}
              onChange={(e) => setContentMd(e.target.value)}
              className="mt-2 min-h-65 w-full resize-y rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-2 focus:ring-white/20"
              required
            />
          </div>

          {error ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={deleteMutation.isPending || publishMutation.isPending || saveMutation.isPending}
              className="rounded-md border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[rgba(127,127,127,0.12)] disabled:opacity-60"
            >
              {saveMutation.isPending ? "Saving…" : "Save & exit"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
