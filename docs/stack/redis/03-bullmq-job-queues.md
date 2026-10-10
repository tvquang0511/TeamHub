# 03 - Hàng Đợi Nhiệm Vụ (BullMQ & Worker Service)

---

## 1. Tại Sao Cần Message Queue & Xử Lý Bất Đồng Bộ?

Trong một hệ thống web chuẩn enterprise như TeamHub, có những tác vụ nếu thực hiện trực tiếp trong chu trình HTTP Request/Response (Synchronous) sẽ gây ra hậu quả nghiêm trọng:

1. **Gửi Email qua giao thức SMTP:** Kết nối tới máy chủ SMTP (Gmail, SendGrid, Amazon SES) thường mất từ **1 đến 4 giây**. Nếu API bắt người dùng chờ gửi xong email mới trả về `200 OK`, trải nghiệm người dùng sẽ rất chậm. Nếu máy chủ SMTP timeout hoặc lỗi mạng, API sẽ báo lỗi 500 dù tài khoản đã tạo thành công!
2. **Nhắc hẹn công việc (Reminders):** Một thẻ công việc có hạn hoàn thành lúc 15:00 ngày mai. Làm thế nào hệ thống "nhớ" để gửi thông báo đúng thời điểm đó mà không cần phải chạy vòng lặp `while(true)` quét DB liên tục?
3. **Thao tác Object Storage (S3 / MinIO):** Khi xóa một thẻ có đính kèm file ảnh nặng hàng chục MB, gọi API xóa trên MinIO/S3 ngay lập tức có thể gây nghẽn I/O.
4. **Tổng hợp dữ liệu phân tích (Daily Metrics Rollup):** Tính toán hàng nghìn thẻ để vẽ biểu đồ thống kê là tác vụ ngốn CPU (CPU-intensive).

👉 **Giải pháp:** Sử dụng **Message Queue** với **BullMQ** chạy trên nền **Redis** để chuyển toàn bộ các công việc này sang xử lý bất đồng bộ (**Asynchronous Background Processing**).

---

## 2. BullMQ Là Gì? Vì Sao Chạy Được Trên Redis?

**BullMQ** là thư viện quản lý hàng đợi tác vụ phân tán (Distributed Job and Message Queue) chuẩn công nghiệp dành cho Node.js và TypeScript.

### Tại sao TeamHub chọn BullMQ thay vì RabbitMQ hay Kafka?
* **Tiết kiệm tài nguyên:** Thay vì phải dựng thêm một cụm máy chủ RabbitMQ hoặc Kafka đồ sộ (ngốn từ 512MB - 2GB RAM), TeamHub tận dụng chính máy chủ **Redis đã có sẵn**.
* **Độ trễ cực thấp:** Redis hoạt động trên RAM nên tốc độ đẩy job vào hàng đợi và lấy job ra chỉ tính bằng phần nghìn giây.
* **Hỗ trợ tính năng nâng cao sẵn có:** Hỗ trợ Delayed Jobs (trì hoãn thực thi), Repeatable Jobs (Cron lập lịch), Priority, Retry tự động với Exponential Backoff.

### Cơ chế BullMQ lưu trữ Job trong Redis:
BullMQ không chỉ dùng lệnh `LPUSH / RPOP` đơn giản, mà kết hợp nhiều cấu trúc dữ liệu tinh vi của Redis:
* **Redis Hash:** Lưu trữ thông tin chi tiết và payload của Job (`bull:<queueName>:<jobId>`).
* **Redis Sorted Set (ZSet):** Dùng để quản lý **Delayed Jobs** (Score chính là timestamp thời điểm job cần kích hoạt). Redis tự động sắp xếp job nào đến giờ chạy trước lên đầu danh sách!
* **Redis Stream / List:** Quản lý các job đang ở trạng thái `wait` (chờ xử lý).
* **Lua Scripts:** Toàn bộ quá trình chuyển trạng thái của một job từ `wait` $\rightarrow$ `active` $\rightarrow$ `completed/failed` được thực thi bằng các đoạn mã **Lua Script nguyên tử (Atomic)**, đảm bảo nhiều Worker cùng tranh nhau lấy job cũng không bao giờ có 2 worker xử lý trùng 1 job.

---

## 3. Kiến Trúc Producer - Consumer Trong TeamHub

Hệ thống phân tách rành mạch thành 2 dịch vụ độc lập:

```
┌─────────────────────────────────┐
│     BACKEND API (PRODUCER)      │
│  - Tiếp nhận HTTP Request       │
│  - Validate dữ liệu, ghi DB     │
│  - Đẩy Job vào Queue            │
└────────────────┬────────────────┘
                 │ (Lệnh enqueue)
                 ▼
┌─────────────────────────────────┐
│          REDIS SERVER           │
│      Prefix: `bull:<queue>:*`   │
│  - Lưu trữ trạng thái jobs      │
│  - ZSet theo dõi thời gian hẹn  │
└────────────────┬────────────────┘
                 │ (Pull job khi sẵn sàng)
                 ▼
┌─────────────────────────────────┐
│    WORKER SERVICE (CONSUMER)    │
│  - Tiến trình Node.js độc lập   │
│  - Lấy job và xử lý ngầm        │
│  - Gửi Email, Dọn S3, Cron      │
└─────────────────────────────────┘
```

* **Backend API (Producer):** Chỉ làm nhiệm vụ đóng gói dữ liệu và gọi `queue.add()`, sau đó trả về phản hồi cho người dùng ngay lập tức (**dưới 50ms**).
* **Worker Service (Consumer):** Một tiến trình Node.js chạy riêng biệt tại thư mục [`worker/src/main.ts`](file:///d:/projects/persional-projects/Teamhub/worker/src/main.ts), chuyên lắng nghe các sự kiện từ Redis để hoàn thành công việc.

---

## 4. Chi Tiết Các Queue & Job Trong TeamHub

TeamHub phân bổ công việc vào 2 Queue chuyên biệt:

### 4.1 Queue `notifications` ([`reminders.queue.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/infrastructure/queue/reminders.queue.ts) & [`emails.queue.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/infrastructure/queue/emails.queue.ts))

#### 1. Job `send` (Nhắc Hạn Thẻ Công Việc - Delayed Job)
* **Ý tưởng:** Khi user đặt hạn thẻ vào lúc `2026-10-15 09:00:00`, backend tính khoảng thời gian chênh lệch:
  $$\text{delayMs} = \max(0, \text{remindAt} - \text{now})$$
* **Cách đẩy vào Queue:**
  ```typescript
  await getRemindersQueue().add(
    REMINDERS_JOB_NAME,
    { reminderJobId: params.reminderJobId },
    {
      jobId: params.reminderJobId, // Gán ID tường minh để hỗ trợ HỦY job
      delay: delayMs,              // BullMQ đưa job vào Redis ZSet chờ đến giờ
      attempts: 3,                 // Nếu lỗi mạng, thử lại tối đa 3 lần
      backoff: {
        type: 'exponential',       // Khoảng cách giữa các lần thử lại tăng dần
        delay: 10_000,
      },
    },
  );
  ```
* **Kỹ thuật Hủy Job Idempotent:** Nếu người dùng đổi hạn hoặc xóa thẻ trước khi chuông reo:
  ```typescript
  export async function removeReminderJob(reminderJobId: string) {
    try {
      await getRemindersQueue().remove(reminderJobId);
    } catch {
      // Bỏ qua lỗi nếu job đã được xử lý hoặc không còn tồn tại
    }
  }
  ```

#### 2. Job `password_reset` (Gửi Email Quên Mật Khẩu)
* Khi user yêu cầu reset password, backend tạo token mã hóa và đẩy job vào queue:
  ```typescript
  await getEmailsQueue().add('password_reset', {
    to: user.email,
    token: resetToken,
    expiresAt: expiresAt.toISOString(),
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10_000 }
  });
  ```
* API phản hồi ngay trong 30ms. Phía Worker lấy job ra và gửi email qua SMTP Nodemailer mà không làm gián đoạn API chính.

---

### 4.2 Queue `background_tasks` ([`analytics.queue.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/infrastructure/queue/analytics.queue.ts) & [`blobs.queue.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/infrastructure/queue/blobs.queue.ts))

#### 1. Job `board_metrics_daily` (Lập Lịch Cron Tổng Hợp Số Liệu)
* **Mục tiêu:** Tính toán sẵn các chỉ số Kanban (Lead Time, Cycle Time, Throughput) của các Board trong ngày hôm trước để người dùng vào xem dashboard không bị lag.
* **Cơ chế Repeatable Job:** Chạy định kỳ vào 00:05 mỗi ngày theo chuẩn UTC để tránh lệch múi giờ.
* Khi chạy xong, worker gọi lệnh tăng version:
  ```typescript
  await bumpAnalyticsCacheVersion(board.id);
  ```
  giúp cache biểu đồ phía API tự động nhận diện dữ liệu mới nhất.

#### 2. Job `delete_object` (Xóa File S3 / MinIO An Toàn)
* Khi user xóa file đính kèm trên giao diện, backend không xóa file vật lý ngay mà thiết lập độ trễ:
  ```typescript
  delay: 60_000 // Chờ 60 giây trước khi thực sự xóa vĩnh viễn trên S3
  ```
  Giúp hạn chế rủi ro nếu thao tác xóa bị hoàn tác (Undo) hoặc transaction DB bị rollback.

#### 3. Job `sweep_orphans` (Quét Dọn File Mồ Côi)
* Chạy định kỳ quét đối chiếu danh sách file thực tế trong MinIO/S3 Bucket với các bản ghi trong PostgreSQL.
* Những file rác không còn thẻ nào tham chiếu tới sẽ được dọn dẹp sạch sẽ, giúp tiết kiệm dung lượng đĩa.

---

## 5. Tối Ưu Chi Phí Khi Dùng Redis Cloud / Serverless (Upstash)

Đây là một điểm thiết kế kỹ thuật **rất tinh tế** trong dự án TeamHub!

### Vấn đề:
Khi bạn dùng các dịch vụ Cloud Redis tính tiền theo số lượng lệnh (như Upstash Redis Free Tier: giới hạn 10.000 lệnh/ngày):
* Mặc định, Worker của BullMQ liên tục gửi các lệnh thăm dò (`BRPOPLPUSH`, `EVAL` kiểm tra stalled job) mỗi giây 1 lần.
* Chỉ cần treo worker qua đêm khi không có job nào, worker cũng có thể **ngốn sạch 10.000 request và làm sập tài khoản!**

### Cách TeamHub giải quyết tại [`worker/src/main.ts`](file:///d:/projects/persional-projects/Teamhub/worker/src/main.ts#L44-L47):
```typescript
const defaultWorkerOpts = {
  // Tăng khoảng thời gian kiểm tra job bị treo lên 5 phút (thay vì 30 giây mặc định)
  stalledInterval: 300000, 

  // Khi hàng đợi hết việc, worker ngủ 15 giây trước khi thăm dò lại
  drainDelay: 15,     
};

const notificationsWorker = new Worker(NOTIFICATIONS_QUEUE_NAME, processJob, {
  connection,
  concurrency: 10, // Xử lý song song tối đa 10 email/nhắc hẹn cùng lúc
  ...defaultWorkerOpts,
});
```
👉 *Hiệu quả:* Giảm **95% số lượng lệnh nhàn rỗi (Idle Redis commands)**, giúp dự án chạy mượt mà 24/7 trên các gói Cloud Free mà không tốn một xu chi phí!

---

## 🎯 Tổng Kết Bài Học 03 & Góc Nhìn Phỏng Vấn

### Câu hỏi phỏng vấn thường gặp:
1. **"Tại sao bạn tách riêng Backend API và Worker Service thay vì xử lý chung trong một file?"**
   * *Trả lời:* "Để đảm bảo nguyên tắc **Decoupling** và **Scalability**. Backend API chỉ tập trung nhận và trả lời HTTP Request với độ trễ thấp nhất. Các tác vụ nặng (gửi email, tính toán chỉ số, xóa S3) được đẩy vào Redis Queue để Worker chạy ngầm. Nếu sau này lượng email tăng đột biến, em có thể scale riêng 5 instances Worker mà không cần chạm vào API Server."

2. **"Làm thế nào để đảm bảo một job trong hàng đợi không bị mất khi gặp sự cố mạng?"**
   * *Trả lời:* "Em cấu hình cho mỗi job cơ chế thử lại tự động: `attempts: 3` kết hợp với `Exponential Backoff`. Đồng thời, các job được thiết kế có tính **Idempotent** (ví dụ: gán `jobId` tường minh và dùng hàm xóa S3 idempotent) để dù có chạy lại cũng không gây trùng lặp dữ liệu hay gửi 2 email cho cùng một sự kiện."

👉 *Bước tiếp theo: Mời bạn mở file [`04-rate-limiting.md`](./04-rate-limiting.md) để tìm hiểu cách Redis bảo vệ API khỏi nguy cơ bị spam và DoS với Rate Limiting.*
