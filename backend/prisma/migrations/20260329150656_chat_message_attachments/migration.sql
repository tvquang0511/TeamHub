-- CreateTable
CREATE TABLE "board_message_attachments" (
    "id" UUID NOT NULL,
    "board_id" UUID NOT NULL,
    "message_id" UUID,
    "uploader_id" UUID NOT NULL,
    "bucket" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "url" TEXT,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linked_at" TIMESTAMP(3),

    CONSTRAINT "board_message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_board_message_attachments_board_created_id" ON "board_message_attachments"("board_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "idx_board_message_attachments_message_created_id" ON "board_message_attachments"("message_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "idx_board_message_attachments_uploader_id" ON "board_message_attachments"("uploader_id");

-- AddForeignKey
ALTER TABLE "board_message_attachments" ADD CONSTRAINT "board_message_attachments_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_message_attachments" ADD CONSTRAINT "board_message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "board_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_message_attachments" ADD CONSTRAINT "board_message_attachments_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
