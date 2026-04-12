export type DashboardOnboardingInput = {
  isCredentialsUser: boolean;
  emailVerified: boolean;
  hasBio: boolean;
  hasAvatar: boolean;
  postCount: number;
};

export type OnboardingItem = {
  id: "verify-email" | "add-bio" | "upload-avatar" | "publish-post";
  label: string;
  done: boolean;
  href: string;
};

export function getDashboardOnboardingItems(
  input: DashboardOnboardingInput,
): OnboardingItem[] {
  const items: OnboardingItem[] = [];

  if (input.isCredentialsUser) {
    items.push({
      id: "verify-email",
      label: "Verify your email",
      done: input.emailVerified,
      href: "/dashboard",
    });
  }

  items.push(
    {
      id: "add-bio",
      label: "Add a short bio",
      done: input.hasBio,
      href: "/dashboard/profile",
    },
    {
      id: "upload-avatar",
      label: "Upload an avatar",
      done: input.hasAvatar,
      href: "/dashboard/profile",
    },
    {
      id: "publish-post",
      label: "Publish your first post",
      done: input.postCount > 0,
      href: "/dashboard/posts/new",
    },
  );

  return items;
}

export function getOnboardingProgress(items: OnboardingItem[]) {
  const completed = items.filter((item) => item.done).length;
  const total = items.length;

  return {
    completed,
    total,
    done: completed === total,
  };
}
