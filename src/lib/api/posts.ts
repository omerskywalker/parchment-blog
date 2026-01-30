export type MyPostsResponse =
  | {
      ok: true;
      posts: Array<{
        id: string;
        title: string;
        slug: string;
        publishedAt: string | null;
        createdAt: string;
        updatedAt: string;
      }>;
    }
  | { ok: false; error: string; message?: string };

export async function fetchMyPosts(): Promise<MyPostsResponse> {
  const res = await fetch("/api/posts/mine", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  return res.json();
}

export type CreatePostInput = {
  title: string;
  contentMd: string;
  slug?: string;
};

export type CreatePostResponse =
  | { ok: true; post: { id: string; slug: string } }
  | { ok: false; error: string; message?: string };

export async function createPost(input: CreatePostInput): Promise<CreatePostResponse> {
  const res = await fetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return res.json();
}

export type PostDetail =
  | {
      ok: true;
      post: {
        id: string;
        title: string;
        slug: string;
        contentMd: string;
        publishedAt: string | null;
        createdAt: string;
        updatedAt: string;
      };
    }
  | { ok: false; error: string; message?: string };

export async function fetchPost(id: string): Promise<PostDetail> {
  const res = await fetch(`/api/posts/${id}`, { method: "GET" });
  return res.json();
}

export type UpdatePostInput = {
  title?: string;
  contentMd?: string;
  slug?: string;
};

export type UpdatePostResponse =
  | {
      ok: true;
      post: {
        id: string;
        title: string;
        slug: string;
        contentMd: string;
        publishedAt: string | null;
        updatedAt: string;
      };
    }
  | { ok: false; error: string; message?: string };

export async function updatePost(id: string, input: UpdatePostInput): Promise<UpdatePostResponse> {
  const res = await fetch(`/api/posts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export type DeletePostResponse = { ok: true } | { ok: false; error: string; message?: string };

export async function deletePost(id: string): Promise<DeletePostResponse> {
  const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
  return res.json();
}

export type PublishPostResponse =
  | { ok: true; post: { id: string; publishedAt: string | null; updatedAt: string } }
  | { ok: false; error: string; message?: string };

export async function setPostPublished(
  id: string,
  published: boolean,
): Promise<PublishPostResponse> {
  const res = await fetch(`/api/posts/${id}/publish`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ published }),
  });
  return res.json();
}
