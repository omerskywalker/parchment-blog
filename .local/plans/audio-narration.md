# Audio Narration ("Play article") — implementation plan

## Goal

Twitter-style "Play article" feature on every published post. One click → AI-narrated audio plays in a small persistent floating player. Cached per post so cost collapses to ~$0 after the first listener.

## Decisions (locked)

| Decision        | Choice                                 | Notes                                                                                  |
| --------------- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| TTS provider    | OpenAI TTS (`tts-1`)                   | Wired through Replit AI integration — no separate API key needed                       |
| Voice           | **onyx**                               | One house voice for brand consistency                                                  |
| Cost model      | Blog absorbs the cost                  | Re-evaluate when monthly TTS spend trends past a threshold; rate-limit then            |
| Drafts          | **Not playable**                       | Same scope rule as the .md export — published posts only                               |
| Caching         | Generate on first play, persist to S3  | Subsequent listeners stream the cached MP3                                             |
| Staleness       | Lazy — compare charCount on play       | Regenerate when post text drifts materially (>2% character delta)                      |
| Sentence-sync   | Deferred (v2)                          | OpenAI TTS doesn't return word timestamps; heuristic alignment is a polish-stage task  |
| Cross-page      | Player resets on navigation            | No global audio context in v1                                                          |

## Architecture

```
Reader hits Play
  ↓
GET /api/posts/[slug]/audio
  ↓
  Cached + fresh? → return signed URL → <audio> streams it
  Missing or stale? → POST /api/posts/[slug]/audio/generate
                      ↓
                     Strip markdown → plain text for TTS
                      ↓
                     OpenAI TTS (onyx) → MP3 bytes
                      ↓
                     Upload to S3 → upsert PostAudio row
                      ↓
                     Return URL → <audio> streams it
```

## Schema

New table `PostAudio` (one row per published post):

```prisma
model PostAudio {
  id          String   @id @default(cuid())
  postId      String   @unique
  voice       String   @default("onyx")
  audioKey    String   // S3 key, e.g. "audio/<postId>/onyx.mp3"
  durationSec Int
  charCount   Int      // for staleness detection vs current post.contentMd
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  post        Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
}
```

`Post` gets a back-relation: `audio PostAudio?`.

## Endpoints

- **GET** `/api/posts/[slug]/audio` → 200 `{ ok, audioUrl, durationSec }` | 404 if no cached audio | 410 if stale | 403 if draft
- **POST** `/api/posts/[slug]/audio/generate` → 200 `{ ok, audioUrl, durationSec }` | 403 if draft | 502 if TTS fails

Generation is idempotent — concurrent calls deduped via the unique constraint on `postId` (upsert).

## UI

- **Play button** on the public post page next to the existing share/stats row. Same visual aesthetic as the share buttons (border, rounded-md, text-sm).
- **Floating player** (client component, mounts when audio is first requested):
  - Bottom-right pill on desktop, bottom-center bar on mobile
  - Collapsed state: play/pause icon + post title + close
  - Expanded state: scrub bar, current/total time, ±15s skip, 1×/1.25×/1.5×/2× speed
  - Dismissible; doesn't survive cross-page navigation in v1

## Cost reality check

- OpenAI TTS `tts-1`: ~$0.015 per 1k characters
- Average post (~5k chars): ~$0.075 per generation
- After cache: $0
- 100 published posts, all listened to once: ~$7.50 total
- Same 100 posts, listened to 10× each: still ~$7.50 total

If we ever hit a month where new-generation cost exceeds a threshold (revisit later), we throttle: e.g. require login to trigger generation, or limit generation rate per IP.

## Build sequence

This branch will land in incremental commits, all on the same draft PR:

1. ✅ **Scaffold** — schema migration, endpoint stubs returning 501, this plan doc
2. **TTS lib + S3 upload helper** — `src/lib/server/tts.ts` (OpenAI client), `src/lib/server/audioStorage.ts` (S3 put + signed URL)
3. **Markdown → plain text** — `src/lib/audioText.ts` (strip code blocks, image syntax, link URLs; keep heading text + body), with unit tests
4. **GET endpoint** — real implementation, cache lookup + staleness check
5. **POST /generate endpoint** — real implementation, dedup via upsert
6. **Floating player component** — `src/app/components/post/PostAudioPlayer.tsx`
7. **Play button + wiring** on `/posts/[slug]/page.tsx`
8. **Tests** — endpoint behavior, staleness, text-stripping
9. **Mark PR ready for review**
