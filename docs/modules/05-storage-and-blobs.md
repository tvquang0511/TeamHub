# 05 - Lưu Trữ Tệp & Tác Vụ Dọn Rác Tự Động (Object Storage & Janitor Sweeper)

---

## 1. Vấn Đề Kinh Điển Của Việc Upload File Trong Web App

Trong các hệ thống Kanban cộng tác như Trello hay Jira, người dùng liên tục tải lên ảnh đại diện (Avatars), hình nền dự án, tài liệu PDF, file nén đính kèm trong thẻ (Card Attachments) và tin nhắn (Chat Attachments).

### 1.1 Sai lầm thường gặp: Upload qua Backend Server
Cách làm sơ khai là dùng `multer` để nhận file từ Client lên Server API, sau đó Server API mới tải tiếp file đó lên Cloud Storage (S3 / MinIO):

```
[ Client ] ──(1. Upload file 50MB)──► [ Backend API ] ──(2. Upload 50MB)──► [ S3 / MinIO ]
```
❌ **Thảm họa:**
* **Băng thông máy chủ bị nhân đôi:** Server phải vừa tốn băng thông Download từ Client, vừa tốn băng thông Upload lên S3.
* **Nghẽn RAM & CPU:** Xử lý file lớn trong bộ nhớ làm đứng Event Loop của Node.js, khiến các request API khác của người dùng bị giật lag.
* **Server dễ bị sập bởi DoS:** Kẻ xấu chỉ cần gửi 10 file video 500MB đồng thời là API server cạn kiệt RAM và crash ngay lập tức.

---

### 1.2 Giải Pháp Của TeamHub: Kiến Trúc Direct-To-Storage (Presigned URLs)

TeamHub áp dụng mô hình chuẩn công nghiệp: **Client tải file trực tiếp lên Object Storage thông qua Presigned URL có chữ ký số ngắn hạn**.

```
[ Client ]                                     [ Backend API ]                           [ S3 / MinIO Storage ]
    │                                                 │                                            │
    │───(1. POST /attachments/init)──────────────────►│                                            │
    │    Payload: { fileName, fileSize, contentType } │                                            │
    │                                                 │ (Kiểm tra quyền & tạo chữ ký SigV4)        │
    │◄──(2. Trả về Presigned PUT URL, TTL: 300s)──────┤                                            │
    │                                                                                              │
    │───(3. TẢI FILE TRỰC TIẾP LÊN STORAGE: HTTP PUT Presigned URL)───────────────────────────────►│
    │◄──(4. Storage phản hồi HTTP 200 OK)──────────────────────────────────────────────────────────┤
    │                                                 │                                            │
    │───(5. POST /attachments/commit)────────────────►│                                            │
    │    Payload: { cardId, objectKey, fileSize }     │                                            │
    │                                                 │───(6. Lưu Metadata vào PostgreSQL)─────────┤
    │◄──(7. Hoàn tất tạo Attachment)──────────────────┤
```

👉 **Lợi ích vượt bậc:**
1. **Tải trọng của Backend Server = 0:** API không bao giờ phải chạm vào 1 byte dữ liệu nhị phân nào của file.
2. **Tốc độ tối đa:** Tận dụng tối đa băng thông đa luồng giữa Client và cụm Storage.
3. **An toàn tuyệt đối:** Presigned URL tự động hết hạn sau 5 phút (300 giây). Hết hạn thì không ai có thể upload vào đường dẫn đó nữa.

---

## 2. Tự Hiện Thực Hóa Chuẩn Ký Chữ Ký Số AWS Signature Version 4 (SigV4)

Thay vì cài đặt bộ thư viện khổng lồ `@aws-sdk/client-s3` (nặng hàng chục MB node_modules), TeamHub tự triển khai thuật toán ký **SigV4 chuẩn HMAC-SHA256** bằng module `crypto` có sẵn của Node.js:

File: [`backend/src/infrastructure/storage/minio.presign.put.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/infrastructure/storage/minio.presign.put.ts)

```typescript
function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}
```

### Hỗ Trợ Đa Dạng Hạ Tầng (Agnostic Storage Provider):
Code tại [`backend/src/infrastructure/storage/index.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/infrastructure/storage/index.ts) tự động tương thích với:
* **Local Development:** MinIO chạy trong Docker (`http://localhost:9000`).
* **Cloud Production:** Amazon S3, Cloudflare R2, hoặc Supabase S3 Compatible Storage.

---

## 3. Phân Tách Hai Vùng Lưu Trữ: Public vs Private Buckets

Hệ thống chia làm 2 Bucket với cơ chế bảo mật hoàn toàn khác nhau:

| Tiêu chí | `teamhub-public` (Công khai) | `teamhub-attachments` (Riêng tư) |
| :--- | :--- | :--- |
| **Dữ liệu lưu trữ** | Ảnh đại diện Avatar, Ảnh nền Workspace / Board | File đính kèm thẻ, Tài liệu mật, File đính kèm Chat |
| **Cơ chế đọc** | Trả về link trực tiếp (Direct Public URL) | Bắt buộc xin **Presigned GET URL** ngắn hạn |
| **Kiểm tra quyền** | Ai cũng có thể tải nếu có link | Kiểm tra JWT và quyền thành viên Board (`isBoardMember`) |
| **Thời hạn link** | Vĩnh viễn (kèm query `?v=timestamp` chống cache) | Tự động hủy sau 5 phút |

---

## 4. Cơ Chế Xóa Trì Hoãn An Toàn (Delayed Cleanup - 60s Grace Period)

Khi người dùng bấm xóa một file đính kèm trên giao diện Kanban, điều gì sẽ xảy ra nếu ta gọi lệnh xóa file trên MinIO/S3 ngay lập tức?
* Nếu giao dịch Database bị Rollback do lỗi mạng, dữ liệu trong DB vẫn còn nhưng file vật lý trên S3 đã bị mất vĩnh viễn!
* Người dùng không có cơ hội hoàn tác (Undo).

### Cách TeamHub giải quyết bằng BullMQ:
Tại [`backend/src/infrastructure/queue/blobs.queue.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/infrastructure/queue/blobs.queue.ts#L37-L53):
```typescript
export async function enqueueDeleteObject(input: { bucket: string; objectKey: string }) {
  await getBlobsQueue().add(
    BLOBS_JOB_DELETE_OBJECT,
    { type: "delete_object", bucket: input.bucket, objectKey: input.objectKey },
    {
      // Tính Idempotent: Gán jobId bằng chính đường dẫn file để tránh đẩy trùng job
      jobId: `${input.bucket}/${input.objectKey}`,
      
      // TRÌ HOÃN THỰC THI 60 GIÂY
      delay: 60_000, 
      
      attempts: 10,
      backoff: { type: "exponential", delay: 10_000 },
    },
  );
}
```
👉 *Quy trình:* Database xóa bản ghi trước. Lệnh xóa vật lý trên S3 được đưa vào hàng đợi `background_tasks` và **ngủ yên 60 giây**. Sau 60 giây, Worker ngầm mới thức dậy và xóa file trên S3 một cách an toàn.

---

## 5. Tiến Trình Dọn Rác Mồ Côi Định Kỳ (Janitor Sweeper Cron)

### 5.1 Vấn nạn "File Mồ Côi" (Orphaned Files)
Trong mô hình Presigned URL:
1. Người dùng bấm "Đính kèm file", chọn file 50MB $\rightarrow$ Client xin Presigned URL thành công $\rightarrow$ Tải file 50MB lên S3 thành công.
2. Đúng lúc này, người dùng tắt tab trình duyệt hoặc mất điện trước khi API `commit` được gọi!
3. **Kết quả:** File 50MB nằm vĩnh viễn trên S3, nhưng trong Database PostgreSQL hoàn toàn không có bản ghi nào tham chiếu tới nó.
4. Sau 6 tháng, hàng trăm GB file rác tích tụ sẽ làm đầy ổ cứng máy chủ hoặc đội chi phí Cloud S3 lên hàng trăm USD!

---

### 5.2 Thuật Toán Quét Dọn Reconcile Của Worker Sweeper
File: [`worker/src/modules/blobs/blobs.sweeper.ts`](file:///d:/projects/persional-projects/Teamhub/worker/src/modules/blobs/blobs.sweeper.ts)

Hệ thống lên lịch một Repeatable Cron Job (`ensureBlobSweeperJob`) chạy lúc nửa đêm để thực hiện thuật toán đối soát 3 bước:

```
[ BƯỚC 1: LẬP DANH SÁCH FILE HỢP LỆ TRONG DATABASE ]
Worker query lấy toàn bộ objectKey đang được tham chiếu:
- Bảng card_attachments
- Bảng board_message_attachments
- Bảng users (avatar_url)
- Bảng workspaces (background_image_url)
└─► Gom vào cấu trúc Set: `referenced = Set<string>()`

───────────────────────────────────────────────────────

[ BƯỚC 2: QUÉT TOÀN BỘ FILE THỰC TẾ TRÊN S3 BUCKET ]
Worker dùng API listObjects() để duyệt qua từng file trong Bucket
└─► Lấy ra: objectKey, lastModified

───────────────────────────────────────────────────────

[ BƯỚC 3: ĐỐI SOÁT VÀ TIÊU HỦY FILE RÁC ]
Với mỗi file trên S3:
├─► Nếu có trong `referenced`: File hợp lệ ──► BỎ QUA.
└─► Nếu KHÔNG có trong `referenced`:
       ├─► Tuổi của file < 2 ngày (Grace Period): Có thể người dùng đang tải dở ──► BỎ QUA.
       └─► Tuổi của file > 2 ngày: CHẮC CHẮN LÀ FILE RÁC MỒ CÔI! ──► XÓA VĨNH VIỄN!
```

---

## 🎯 Góc Nhìn Phỏng Vấn (Interview Cheatsheet)

### Câu hỏi 1: "Tại sao bạn không cho người dùng upload file trực tiếp qua backend Node.js mà phải dùng cơ chế Presigned URL?"
* **Trả lời:** "Nếu upload qua Backend, tiến trình Node.js sẽ phải gánh toàn bộ lưu lượng mạng và phân bổ RAM để lưu giữ stream dữ liệu trước khi chuyển tiếp lên S3. Node.js vốn là môi trường Single-Threaded Event Loop, việc xử lý I/O tệp tin lớn sẽ làm tắc nghẽn khả năng phục vụ các API khác và dễ bị tấn công cạn kiệt tài nguyên (DoS). Bằng cách sử dụng **Presigned PUT URL**, Backend chỉ đóng vai trò cấp chữ ký số ngắn hạn (300s). Client sẽ tải trực tiếp dữ liệu nhị phân lên thẳng S3/MinIO. Điều này giúp Backend Server giữ mức sử dụng CPU/RAM gần như bằng 0 và tận dụng tối đa băng thông đa luồng của Object Storage."

### Câu hỏi 2: "Bạn giải quyết tình trạng file rác tồn đọng trên S3 khi người dùng upload dở dang như thế nào?"
* **Trả lời:** "Em xây dựng một tiến trình dọn dẹp ngầm gọi là **Janitor Sweeper** chạy định kỳ bằng BullMQ Cron. Hàng ngày, worker sẽ truy vấn danh sách tất cả file đang được database quản lý và đối soát với danh sách file thực tế được liệt kê từ S3. Những file nào nằm trên S3 mà không có bản ghi tham chiếu trong database, đồng thời đã tồn tại quá thời gian ân hạn 48 giờ (để đảm bảo không xóa nhầm file đang trong quá trình upload), sẽ được xác định là file mồ côi (Orphan) và bị hệ thống tự động xóa bỏ để tiết kiệm chi phí lưu trữ."

---

## 🏆 Hoàn Thành Module 05
Tài liệu đã bóc tách toàn bộ quy trình:
1. Mô hình Direct-to-Storage Upload với SigV4 tự viết.
2. Phân tách Public vs Private Storage.
3. Hàng đợi Xóa Trì Hoãn 60 giây an toàn (`blobs.queue`).
4. Thuật toán Đối soát Dọn rác Mồ côi (`blobs.sweeper`).
