-- AlterEnum
ALTER TYPE "card_attachment_type" ADD VALUE 'CARD';

-- AlterTable
ALTER TABLE "card_attachments" ADD COLUMN     "referenced_card_id" UUID;
