-- AlterTable
ALTER TABLE "lists" ADD COLUMN     "is_doing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_done" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "board_metrics_daily" (
    "id" UUID NOT NULL,
    "board_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "cards_created_count" INTEGER NOT NULL DEFAULT 0,
    "cards_done_count" INTEGER NOT NULL DEFAULT 0,
    "cards_moved_count" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "attachments_count" INTEGER NOT NULL DEFAULT 0,
    "assignees_added_count" INTEGER NOT NULL DEFAULT 0,
    "assignees_removed_count" INTEGER NOT NULL DEFAULT 0,
    "wip_count" INTEGER NOT NULL DEFAULT 0,
    "overdue_count" INTEGER NOT NULL DEFAULT 0,
    "avg_cycle_time_sec" INTEGER,
    "avg_lead_time_sec" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_metrics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_metrics_monthly" (
    "id" UUID NOT NULL,
    "board_id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "cards_created_count" INTEGER NOT NULL DEFAULT 0,
    "cards_done_count" INTEGER NOT NULL DEFAULT 0,
    "cards_moved_count" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "attachments_count" INTEGER NOT NULL DEFAULT 0,
    "assignees_added_count" INTEGER NOT NULL DEFAULT 0,
    "assignees_removed_count" INTEGER NOT NULL DEFAULT 0,
    "avg_cycle_time_sec" INTEGER,
    "avg_lead_time_sec" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_metrics_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_board_metrics_daily_date" ON "board_metrics_daily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "uq_board_metrics_daily_board_date" ON "board_metrics_daily"("board_id", "date");

-- CreateIndex
CREATE INDEX "idx_board_metrics_monthly_month" ON "board_metrics_monthly"("month");

-- CreateIndex
CREATE UNIQUE INDEX "uq_board_metrics_monthly_board_month" ON "board_metrics_monthly"("board_id", "month");

-- AddForeignKey
ALTER TABLE "board_metrics_daily" ADD CONSTRAINT "board_metrics_daily_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_metrics_monthly" ADD CONSTRAINT "board_metrics_monthly_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
