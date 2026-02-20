"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { s3PublicUrlFromKey } from "@/lib/s3";
import { useSearchParams } from "next/navigation";

import {
  fetchMyProfile,
  patchMyProfile,
  presignAvatarUpload,
  uploadToS3PutUrl,
} from "@/lib/api/profile";

export default function ProfilePage() {
  const sp = useSearchParams();
  const welcome = sp.get("welcome") === "1";
  const qc = useQueryClient();

  const [showWelcome, setShowWelcome] = React.useState(welcome);

  React.useEffect(() => {
    setShowWelcome(welcome);
  }, [welcome]);

  const me = useQuery({
    queryKey: ["me-profile"],
    queryFn: fetchMyProfile,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: false,
  });

  const [username, setUsername] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [avatarKey, setAvatarKey] = React.useState<string | null>(null);
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (me.data?.ok) {
      setUsername(me.data.user.username ?? "");
      setBio(me.data.user.bio ?? "");
      setAvatarKey(me.data.user.avatarKey ?? null);
    }
  }, [me.data?.ok]);

  const save = useMutation({
    mutationFn: () =>
      patchMyProfile({ username: username.trim(), bio, avatarKey: avatarKey ?? undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me-profile"] });
    },
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const presign = await presignAvatarUpload(file.type);
      if (!presign.ok) throw new Error(presign.message ?? presign.error);

      await uploadToS3PutUrl(presign.uploadUrl, file);

      // save key to profile
      const patched = await patchMyProfile({ avatarKey: presign.key });
      if (!patched.ok) throw new Error(patched.message ?? patched.error);

      return presign.key;
    },
    onSuccess: (key) => {
      setAvatarKey(key);
      qc.invalidateQueries({ queryKey: ["me-profile"] });
    },
  });

  const avatarUrl = localPreview ?? s3PublicUrlFromKey(avatarKey);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-pick same file
    if (!file) return;

    // basic client checks
    const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowed.has(file.type)) {
      alert("Please upload a PNG, JPG, or WEBP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Please keep avatar under 2MB.");
      return;
    }

    const preview = URL.createObjectURL(file);
    setLocalPreview(preview);

    try {
      await uploadAvatar.mutateAsync(file);
    } catch (err) {
      console.error(err);
      alert((err as Error).message ?? "Upload failed.");
    } finally {
      URL.revokeObjectURL(preview);
      setLocalPreview(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {showWelcome && (
        <div className="mx-auto mb-4 max-w-3xl rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-white">Welcome to Parchment 👋</p>
              <p className="mt-1 text-sm text-white/60">
                Set your avatar + bio so your posts look great.
              </p>
            </div>
            <button
              onClick={() => setShowWelcome(false)}
              className="rounded-md border border-white/15 bg-white/10 px-3 py-1 text-sm text-white/80 hover:bg-white/15"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6">
        {me.isLoading ? (
          <p className="text-white/60">Loading…</p>
        ) : me.data?.ok ? (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex items-center gap-4 sm:flex-col sm:items-start">
              <div className="h-20 w-20 overflow-hidden rounded-full border border-white/10 bg-white/5">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>

              <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/90 transition-colors hover:bg-[rgba(127,127,127,0.12)]">
                {uploadAvatar.isPending ? "Uploading…" : "Change avatar"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={onPickFile}
                />
              </label>
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <label className="text-sm text-white/60">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. omerskywalker"
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/30"
                />

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <p className="text-xs text-white/40">
                    Public URL: /u/{username.trim().toLowerCase() || "username"}
                  </p>

                  {username.trim() ? (
                    <a
                      href={`/u/${username.trim().toLowerCase()}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/90 transition-colors hover:bg-[rgba(127,127,127,0.12)]"
                    >
                      View public profile <span className="text-white/40">↗</span>
                    </a>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="text-sm text-white/60">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  maxLength={280}
                  placeholder="A short bio (max 280 chars)"
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/30"
                />
                <p className="mt-1 text-xs text-white/40">{bio.length}/280</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => save.mutate()}
                  disabled={save.isPending || uploadAvatar.isPending}
                  className="rounded-md border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 transition-colors hover:bg-[rgba(127,127,127,0.12)] disabled:opacity-60"
                >
                  {save.isPending ? "Saving…" : "Save"}
                </button>

                {save.isError ? (
                  <p className="text-sm text-red-300">{(save.error as Error).message}</p>
                ) : null}
                {save.isSuccess ? <p className="text-sm text-emerald-200">Saved.</p> : null}
              </div>

              <div className="text-xs text-white/35">
                Signed in as <span className="text-white/50">{me.data.user.email}</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-white/80">Unable to load profile.</p>
            <p className="mt-1 text-sm text-white/50">{me.data?.message ?? me.data?.error}</p>
          </div>
        )}
      </div>
    </main>
  );
}
