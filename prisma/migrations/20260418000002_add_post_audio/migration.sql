-- CreateTable
CREATE TABLE "PostAudio" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "voice" TEXT NOT NULL DEFAULT 'onyx',
    "audioKey" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "charCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostAudio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostAudio_postId_key" ON "PostAudio"("postId");

-- AddForeignKey
ALTER TABLE "PostAudio" ADD CONSTRAINT "PostAudio_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
