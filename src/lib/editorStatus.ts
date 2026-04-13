export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

export function formatAutoSaveStatus(
  status: AutoSaveStatus,
  lastSavedAt: Date | null,
) {
  if (status === "saving") return "Saving draft…";
  if (status === "error") return "Autosave failed. Your latest changes are still unsaved.";

  if (status === "saved" && lastSavedAt) {
    return `Draft saved at ${new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(lastSavedAt)}`;
  }

  return null;
}
