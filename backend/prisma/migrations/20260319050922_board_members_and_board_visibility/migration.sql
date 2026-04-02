-- CreateEnum
CREATE TYPE "board_visibility" AS ENUM ('PRIVATE', 'WORKSPACE');

-- CreateEnum
CREATE TYPE "board_member_role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "boards" ADD COLUMN     "visibility" "board_visibility" NOT NULL DEFAULT 'PRIVATE';

-- CreateTable
CREATE TABLE "board_members" (
    "id" UUID NOT NULL,
    "board_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "board_member_role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_board_members_user_id" ON "board_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_board_members_board_user" ON "board_members"("board_id", "user_id");

-- AddForeignKey
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
