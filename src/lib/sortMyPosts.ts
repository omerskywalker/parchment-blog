export type PostSortKey = "date" | "views" | "fires";

export type SortablePost = {
  updatedAt: string;
  viewCount: number;
  fireCount: number;
};

export function sortMyPosts<T extends SortablePost>(posts: T[], by: PostSortKey): T[] {
  const copy = [...posts];
  switch (by) {
    case "views":
      return copy.sort((a, b) => b.viewCount - a.viewCount);
    case "fires":
      return copy.sort((a, b) => b.fireCount - a.fireCount);
    case "date":
    default:
      return copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}
