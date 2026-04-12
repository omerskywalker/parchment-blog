export type NewPostDraft = {
  title: string;
  contentMd: string;
  slug: string;
  tags: string[];
};

export function hasNewPostDraftContent(draft: NewPostDraft) {
  return Boolean(
    draft.title.trim() ||
      draft.contentMd.trim() ||
      draft.slug.trim() ||
      draft.tags.length > 0,
  );
}
