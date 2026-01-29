export const qk = {
    myPosts: () => ["my-posts"] as const,
    post: (id: string) => ["post", id] as const,
  };