import { describe, expect, it } from "vitest";
import {
  getDashboardOnboardingItems,
  getOnboardingProgress,
} from "./onboarding";

describe("getDashboardOnboardingItems", () => {
  it("includes email verification for credentials users", () => {
    const items = getDashboardOnboardingItems({
      isCredentialsUser: true,
      emailVerified: false,
      hasBio: false,
      hasAvatar: false,
      postCount: 0,
    });

    expect(items.map((item) => item.id)).toContain("verify-email");
  });

  it("omits email verification for OAuth users", () => {
    const items = getDashboardOnboardingItems({
      isCredentialsUser: false,
      emailVerified: true,
      hasBio: false,
      hasAvatar: false,
      postCount: 0,
    });

    expect(items.map((item) => item.id)).not.toContain("verify-email");
  });

  it("marks profile and publishing items complete based on account state", () => {
    const items = getDashboardOnboardingItems({
      isCredentialsUser: true,
      emailVerified: true,
      hasBio: true,
      hasAvatar: false,
      postCount: 2,
    });

    expect(items).toEqual([
      expect.objectContaining({ id: "verify-email", done: true }),
      expect.objectContaining({ id: "add-bio", done: true }),
      expect.objectContaining({ id: "upload-avatar", done: false }),
      expect.objectContaining({ id: "publish-post", done: true }),
    ]);
  });
});

describe("getOnboardingProgress", () => {
  it("reports completion counts accurately", () => {
    const progress = getOnboardingProgress([
      { id: "add-bio", label: "Add a short bio", done: true, href: "/dashboard/profile" },
      { id: "upload-avatar", label: "Upload an avatar", done: false, href: "/dashboard/profile" },
      { id: "publish-post", label: "Publish your first post", done: true, href: "/dashboard/posts/new" },
    ]);

    expect(progress).toEqual({
      completed: 2,
      total: 3,
      done: false,
    });
  });
});
