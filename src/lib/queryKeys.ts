export const qk = {
  // dashboard
  myPosts: () => ["my-posts"] as const,
  post: (id: string) => ["post", id] as const,

  // public
  publicFeed: (opts: { scope: "home" | "posts"; tag?: string | null }) =>
    ["public-posts-cursor", opts.scope, { take: 10, tag: opts.tag ?? null }] as const,
  publicPost: (slug: string) => ["public-post", slug] as const,
  profile: (username: string) => ["profile", username] as const,

  // stats
  postStats: (slug: string) => ["post-stats", slug] as const,
};
