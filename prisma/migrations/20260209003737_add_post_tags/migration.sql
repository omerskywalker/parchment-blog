-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Post_updatedAt_idx" ON "Post"("updatedAt");
