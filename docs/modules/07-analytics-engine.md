# 07 - Động Cơ Phân Tích Chỉ Số Agile (Analytics Engine & Daily Rollup)

---

## 1. Bản Đồ Tổng Quan Module Analytics

Một hệ thống quản lý công việc chuyên nghiệp không thể dừng lại ở việc xem các thẻ Kanban, mà phải cung cấp **các chỉ số đo lường hiệu suất dòng chảy công việc (Flow Metrics)** để giúp trưởng nhóm (Team Lead / Project Manager) nhận diện điểm nghẽn (Bottlenecks).

Module Analytics trong TeamHub đo lường các chỉ số cốt lõi theo phương pháp luận Agile/Kanban:
* **Cycle Time (Thời gian chu kỳ):** Thời gian trung bình từ khi thẻ bắt đầu được xử lý (In Progress) cho đến khi hoàn thành (Done).
* **Lead Time (Thời gian chờ):** Thời gian từ khi thẻ được tạo ra trong hệ thống cho đến khi hoàn thành.
* **Throughput (Năng suất làm việc):** Số lượng thẻ hoàn thành trong từng ngày/tuần.
* **Work In Progress (WIP):** Số lượng thẻ đang dở dang tại thời điểm hiện tại.
* **Overdue Count:** Số lượng thẻ đã quá hạn cam kết nhưng chưa hoàn thành.

---

## 2. Vấn Đề Hiệu Năng: Tại Sao Không Thể Query Trực Tiếp Từ Bảng Giao Dịch?

Nếu mỗi lần người dùng bấm vào tab "Analytics", Backend lại chạy câu lệnh:
```sql
SELECT AVG(finished_at - created_at) 
FROM cards 
JOIN activities ON ... 
WHERE board_id = '...' AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at);
```

❌ **Thảm họa:**
* Bảng `activities` ghi lại toàn bộ lịch sử di chuyển, gán người, đổi hạn của từng thẻ, có thể lên tới **hàng triệu bản ghi**.
* Các phép toán quét mốc thời gian và tính trung bình thời gian (Time Intervals) trên bảng lớn sẽ làm Database hoạt động 100% CPU, gây nghẽn toàn bộ các thao tác kéo thả của những người dùng khác.

---

## 3. Kiến Trúc Rollup Bất Đồng Bộ (Daily Rollup Worker)

TeamHub áp dụng mô hình **Pre-computation (Tính toán trước & Tổng hợp định kỳ)**:

```
[ CÁC THAO TÁC TRONG NGÀY ]
User tạo thẻ, di chuyển thẻ, bình luận
                │
                ▼ (Ghi liên tục)
       [ BẢNG GIAO DỊCH LỚN ]
     `activities`, `cards`, ...
                │
                │ (00:05 UTC Hàng Ngày)
                ▼
     ┌────────────────────────────────────────────────────────┐
     │          BULLMQ WORKER: `board_metrics_daily`          │
     │  - Quét các hoạt động trong ngày hôm qua               │
     │  - Tính toán: Throughput, Lead Time, Cycle Time, WIP   │
     │  - LƯU VÀO BẢNG TỔNG HỢP: `board_metrics_daily`        │
     │  - KÍCH HOẠT: bumpAnalyticsCacheVersion(boardId)       │
     └──────────────────────────┬─────────────────────────────┘
                                │
                                ▼
     ┌────────────────────────────────────────────────────────┐
     │          CLIENT MỞ XEM BIỂU ĐỒ (ANALYTICS)             │
     │  - Đọc từ bảng nhỏ gọn `board_metrics_daily` (Vài chục │
     │    bản ghi thay vì hàng triệu bản ghi)                 │
     │  - Thời gian phản hồi: < 5ms!                          │
     └────────────────────────────────────────────────────────┘
```

---

## 4. Mô Hình Dữ Liệu Bảng Tổng Hợp (`board_metrics_daily`)

Định nghĩa tại [`backend/prisma/schema.prisma`](file:///d:/projects/persional-projects/Teamhub/backend/prisma/schema.prisma#L503-L530):

```prisma
model board_metrics_daily {
  id                    String   @id @default(uuid()) @db.Uuid
  boardId               String   @db.Uuid @map("board_id")
  date                  DateTime @db.Date

  // Các chỉ số đếm số lượng (Counters)
  cardsCreatedCount     Int      @default(0) @map("cards_created_count")
  cardsDoneCount        Int      @default(0) @map("cards_done_count")
  cardsMovedCount       Int      @default(0) @map("cards_moved_count")
  commentsCount         Int      @default(0) @map("comments_count")
  attachmentsCount      Int      @default(0) @map("attachments_count")
  assigneesAddedCount   Int      @default(0) @map("assignees_added_count")
  assigneesRemovedCount Int      @default(0) @map("assignees_removed_count")

  // Trạng thái chụp nhanh tại thời điểm chốt ngày (Snapshots)
  wipCount              Int      @default(0) @map("wip_count")
  overdueCount          Int      @default(0) @map("overdue_count")

  // Chỉ số thời gian trung bình (tính bằng Giây)
  avgCycleTimeSec       Int?     @map("avg_cycle_time_sec")
  avgLeadTimeSec        Int?     @map("avg_lead_time_sec")

  board                 boards   @relation(fields: [boardId], references: [id], onDelete: Cascade)

  @@unique([boardId, date], map: "uq_board_metrics_daily_board_date")
  @@index([date], map: "idx_board_metrics_daily_date")
  @@map("board_metrics_daily")
}
```

---

## 5. Tầng Cache-Aside Phân Tích Với TTL Dài & Versioning

Tại [`backend/src/modules/analytics/analytics.service.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/analytics/analytics.service.ts):

* **Quyền hạn truy cập:** Chỉ `OWNER` hoặc `ADMIN` của Board/Workspace mới có quyền xem biểu đồ phân tích.
* **Cache Key:** Có kèm khoảng ngày và phiên bản `analyticsVer`:
  ```
  cache:v1:analytics:board:{boardId}:from:{from}:to:{to}:ver:{analyticsVer}
  ```
* **TTL Dài:** **600 giây (10 phút)**. Vì dữ liệu phân tích chỉ thay đổi khi tiến trình Rollup ban đêm chạy, nên việc cache 10 phút giúp loại bỏ 99% tải truy vấn xuống database.
* **Invalidation:** Khi worker chạy xong hoặc quản trị viên kích hoạt tổng hợp thủ công (`boardMetricsDaily.ts`), hệ thống gọi:
  ```typescript
  await bumpAnalyticsCacheVersion(board.id);
  ```
  làm mới toàn bộ cache biểu đồ trong tích tắc.

---

## 🎯 Góc Nhìn Phỏng Vấn (Interview Cheatsheet)

### Câu hỏi: "Bạn thiết kế tính năng phân tích và vẽ biểu đồ hiệu năng nhóm như thế nào để không làm chậm hệ thống khi dữ liệu tăng lớn?"
* **Trả lời:** "Đối với các tính năng phân tích (Analytics), việc chạy các truy vấn tổng hợp phức tạp (như tính trung bình Lead Time, Cycle Time) trực tiếp trên các bảng giao dịch lớn như `activities` hay `cards` sẽ gây nghẽn database trầm trọng. Em giải quyết bằng kiến trúc **Daily Rollup Worker** chạy định kỳ ban đêm bằng BullMQ Cron. Worker sẽ tính toán sẵn các chỉ số của ngày hôm trước và lưu vào bảng tổng hợp nhỏ gọn `board_metrics_daily`. Khi người dùng mở xem biểu đồ, API chỉ việc đọc từ bảng tổng hợp này và lưu vào **Redis Cache với TTL 10 phút**. Phương pháp này giúp giảm thời gian phản hồi biểu đồ từ vài giây xuống còn dưới 5ms mà không ảnh hưởng tới các giao dịch Kanban đang chạy."
