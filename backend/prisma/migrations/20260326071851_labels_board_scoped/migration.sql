/*
  Warnings:

  - You are about to drop the column `workspace_id` on the `labels` table. All the data in the column will be lost.
  - Added the required column `board_id` to the `labels` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "labels" DROP CONSTRAINT "labels_workspace_id_fkey";

-- DropIndex
DROP INDEX "idx_labels_workspace_id";

-- AlterTable
ALTER TABLE "labels" DROP COLUMN "workspace_id",
ADD COLUMN     "board_id" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "idx_labels_board_id" ON "labels"("board_id");

-- AddForeignKey
ALTER TABLE "labels" ADD CONSTRAINT "labels_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
