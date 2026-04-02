-- CreateTable
CREATE TABLE "board_invites" (
    "id" UUID NOT NULL,
    "board_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "board_invites_token_key" ON "board_invites"("token");

-- CreateIndex
CREATE INDEX "idx_board_invites_board_id" ON "board_invites"("board_id");

-- CreateIndex
CREATE INDEX "idx_board_invites_email" ON "board_invites"("email");

-- AddForeignKey
ALTER TABLE "board_invites" ADD CONSTRAINT "board_invites_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
