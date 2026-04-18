-- AlterTable
-- Adds the `excerpt` column to Post. PR #95 added this field to the Prisma
-- schema and started reading/writing it from queries, but the migration
-- was never generated, so production crashed with PrismaClientKnownRequestError
-- (P2022 column does not exist) on every page load that selected excerpts.
ALTER TABLE "Post" ADD COLUMN "excerpt" TEXT;
