/*
  Warnings:

  - You are about to drop the `workspace_messages` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "workspace_messages" DROP CONSTRAINT "workspace_messages_sender_id_fkey";

-- DropForeignKey
ALTER TABLE "workspace_messages" DROP CONSTRAINT "workspace_messages_workspace_id_fkey";

-- DropTable
DROP TABLE "workspace_messages";

-- CreateTable
CREATE TABLE "board_messages" (
    "id" UUID NOT NULL,
    "board_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_board_messages_board_created_id" ON "board_messages"("board_id", "created_at", "id");

-- AddForeignKey
ALTER TABLE "board_messages" ADD CONSTRAINT "board_messages_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_messages" ADD CONSTRAINT "board_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
