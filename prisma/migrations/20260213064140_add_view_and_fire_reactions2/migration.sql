/*
  Warnings:

  - You are about to drop the column `likeCount` on the `Post` table. All the data in the column will be lost.
  - Changed the type of `kind` on the `PostReaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ReactionKind" AS ENUM ('FIRE');

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "likeCount",
ADD COLUMN     "fireCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PostReaction" DROP COLUMN "kind",
ADD COLUMN     "kind" "ReactionKind" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PostReaction_postId_visitorId_kind_key" ON "PostReaction"("postId", "visitorId", "kind");
