/*
  Warnings:

  - You are about to drop the `board_invites` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "board_invites" DROP CONSTRAINT "board_invites_board_id_fkey";

-- DropTable
DROP TABLE "board_invites";
