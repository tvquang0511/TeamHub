-- CreateEnum
CREATE TYPE "card_attachment_type" AS ENUM ('FILE', 'LINK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "activity_type" ADD VALUE 'ATTACHMENT_ADDED';
ALTER TYPE "activity_type" ADD VALUE 'ATTACHMENT_REMOVED';

-- CreateTable
CREATE TABLE "card_attachments" (
    "id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "uploader_id" UUID NOT NULL,
    "type" "card_attachment_type" NOT NULL,
    "bucket" TEXT,
    "object_key" TEXT,
    "url" TEXT,
    "file_name" TEXT,
    "mime_type" TEXT,
    "size" INTEGER,
    "link_url" TEXT,
    "link_title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_card_attachments_card_created_id" ON "card_attachments"("card_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "idx_card_attachments_uploader_id" ON "card_attachments"("uploader_id");

-- AddForeignKey
ALTER TABLE "card_attachments" ADD CONSTRAINT "card_attachments_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_attachments" ADD CONSTRAINT "card_attachments_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
