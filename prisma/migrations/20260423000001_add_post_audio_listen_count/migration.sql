-- Track per-audio listen sessions.
--
-- Pinged once per audio URL by PostAudioPlayer's onPlay handler (gated by
-- the same trackedStartRef as `audio_listen_start`), so it counts distinct
-- playback sessions rather than every play/pause toggle.
--
-- Existing rows default to 0; the column is non-nullable so the dashboard
-- aggregate doesn't have to coalesce.

ALTER TABLE "PostAudio"
  ADD COLUMN "listenCount" INTEGER NOT NULL DEFAULT 0;
