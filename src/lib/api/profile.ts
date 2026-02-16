export type MeProfileResponse =
  | {
      ok: true;
      user: { id: string; name: string | null; email: string; username: string | null; bio: string | null; avatarKey: string | null };
    }
  | { ok: false; error: string; message?: string };

export async function fetchMyProfile(): Promise<MeProfileResponse> {
  const res = await fetch("/api/me/profile", { method: "GET" });
  return res.json();
}

export type PatchProfileInput = {
  username?: string;
  bio?: string;
  avatarKey?: string;
};

export type PatchProfileResponse =
  | {
      ok: true;
      user: { id: string; name: string | null; email: string; username: string | null; bio: string | null; avatarKey: string | null };
    }
  | { ok: false; error: string; message?: string };

export async function patchMyProfile(input: PatchProfileInput): Promise<PatchProfileResponse> {
  const res = await fetch("/api/me/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export type PresignAvatarResponse =
  | { ok: true; key: string; uploadUrl: string; publicUrl: string }
  | { ok: false; error: string; message?: string };

export async function presignAvatarUpload(contentType: string): Promise<PresignAvatarResponse> {
  const res = await fetch("/api/uploads/avatar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType }),
  });
  return res.json();
}

export async function uploadToS3PutUrl(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error("Upload failed.");
}
