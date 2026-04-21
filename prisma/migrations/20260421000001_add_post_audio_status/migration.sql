-- Add async-generation lifecycle columns to PostAudio.
--
-- The old model assumed audio was always written in a single request: row
-- exists ⇔ audio is ready. With background generation (Vercel `after()` to
-- escape the 60s function ceiling on long posts), we now write the row at
-- claim-time with status=PENDING and fill in audioKey/durationSec/charCount
-- once the worker finishes. Failures land in status=FAILED with an `error`
-- message for the client to surface.
--
-- Existing rows (all of which already have audio bytes uploaded) default to
-- READY so the migration is non-breaking for production data.

CREATE TYPE "PostAudioStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

ALTER TABLE "PostAudio"
  ADD COLUMN "status" "PostAudioStatus" NOT NULL DEFAULT 'READY',
  ADD COLUMN "error"  TEXT,
  ALTER COLUMN "audioKey"    DROP NOT NULL,
  ALTER COLUMN "durationSec" DROP NOT NULL,
  ALTER COLUMN "charCount"   DROP NOT NULL;
