-- CreateTable
CREATE TABLE "FireNotification" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "milestone" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FireNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FireNotification_postId_milestone_key" ON "FireNotification"("postId", "milestone");

-- CreateIndex
CREATE INDEX "FireNotification_postId_idx" ON "FireNotification"("postId");

-- AddForeignKey
ALTER TABLE "FireNotification" ADD CONSTRAINT "FireNotification_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
