export type MyProfileResponse =
  | {
      ok: true;
      user: {
        email: string;
        name: string | null;
        username: string | null;
        bio: string | null;
        avatarKey: string | null;
      };
    }
  | { ok: false; error: string; message?: string };

export async function fetchMyProfile(): Promise<MyProfileResponse> {
  const res = await fetch("/api/dashboard/profile", { method: "GET" });
  return res.json();
}

export type PatchMyProfileInput = {
  username?: string;
  bio?: string;
  avatarKey?: string;
};

export type PatchMyProfileResponse =
  | {
      ok: true;
      user: {
        email: string;
        name: string | null;
        username: string | null;
        bio: string | null;
        avatarKey: string | null;
      };
    }
  | { ok: false; error: string; message?: string };

export async function patchMyProfile(input: PatchMyProfileInput): Promise<PatchMyProfileResponse> {
  const res = await fetch("/api/dashboard/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export type PresignAvatarResponse =
  | { ok: true; uploadUrl: string; key: string }
  | { ok: false; error: string; message?: string };

export async function presignAvatarUpload(contentType: string): Promise<PresignAvatarResponse> {
  const res = await fetch("/api/dashboard/profile/avatar/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType }),
  });
  return res.json();
}

export async function uploadToS3PutUrl(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!res.ok) {
    throw new Error(`S3 upload failed (${res.status})`);
  }
}
