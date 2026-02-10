// lib/validators/posts.ts
import { z } from "zod";

export const POST_TITLE_MIN = 3;
export const POST_TITLE_MAX = 120;
export const POST_CONTENT_MIN = 1;
export const POST_CONTENT_MAX = 100_000;

// tags
export const POST_TAGS_MAX = 20;
export const POST_TAG_MAX_LEN = 32;

// markdown for MVP - rich text editor come soon
// contentMd = markdown string

// one tag: lowercase, 1–32 chars, letters/numbers, allow hyphens
export const tagSchema = z
  .string()
  .trim()
  .min(1, "Tag cannot be empty.")
  .max(POST_TAG_MAX_LEN, `Tag must be at most ${POST_TAG_MAX_LEN} characters.`)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Tags must be lowercase words separated by hyphens.");

export const createPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(POST_TITLE_MIN, `Title must be at least ${POST_TITLE_MIN} characters.`)
    .max(POST_TITLE_MAX, `Title must be at most ${POST_TITLE_MAX} characters.`),

  contentMd: z
    .string()
    .min(POST_CONTENT_MIN, `Content must be at least ${POST_CONTENT_MIN} character.`)
    .max(POST_CONTENT_MAX, `Content must be at most ${POST_CONTENT_MAX} characters.`),

  // - if not provided, we'll generate from title.
  // - if provided, we validate and normalize it.
  slug: z
    .string()
    .trim()
    .min(1, "Slug cannot be empty.")
    .max(160, "Slug is too long.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase words separated by hyphens.")
    .optional(),

  tags: z.array(tagSchema).max(POST_TAGS_MAX, `Max ${POST_TAGS_MAX} tags.`).optional(),
});

// update is partial - only patch what we changed.
export const updatePostSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(POST_TITLE_MIN, `Title must be at least ${POST_TITLE_MIN} characters.`)
      .max(POST_TITLE_MAX, `Title must be at most ${POST_TITLE_MAX} characters.`)
      .optional(),

    contentMd: z
      .string()
      .min(POST_CONTENT_MIN, `Content must be at least ${POST_CONTENT_MIN} character.`)
      .max(POST_CONTENT_MAX, `Content must be at most ${POST_CONTENT_MAX} characters.`)
      .optional(),

    slug: z
      .string()
      .trim()
      .min(1, "Slug cannot be empty.")
      .max(160, "Slug is too long.")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase words separated by hyphens.")
      .optional(),

    tags: z.array(tagSchema).max(POST_TAGS_MAX, `Max ${POST_TAGS_MAX} tags.`).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Update payload cannot be empty.",
  });

// publish / unpublish
export const publishPostSchema = z.object({
  published: z.boolean(),
});

// helpers
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// types inferred from schemas
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type PublishPostInput = z.infer<typeof publishPostSchema>;
