# 01 - Bản Chất Cốt Lõi Của PostgreSQL (RDBMS & ACID Engine)

---

## 1. PostgreSQL Là Gì? Vì Sao TeamHub Chọn PostgreSQL?

**PostgreSQL** (thường gọi tắt là Postgres) là hệ quản trị cơ sở dữ liệu quan hệ - đối tượng (Object-Relational Database Management System - ORDBMS) mã nguồn mở tiên tiến nhất hiện nay, ra đời từ dự án POSTGRES tại Đại học California, Berkeley vào năm 1986.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   HỆ SINH THÁI LƯU TRỮ TEAMHUB                         │
├─────────────────┬──────────────────────────────────────────────────────┤
│ Lớp Lưu Trữ     │ Công Nghệ & Vai Trò Trong Kiến Trúc                  │
├─────────────────┼──────────────────────────────────────────────────────┤
│ Database Chính  │ PostgreSQL 16 (Lưu Trữ Dữ Liệu Quan Hệ, ACID, Schema)│
│ ORM & Data Layer│ Prisma ORM (Type-Safe, Rust Query Engine, Batching)  │
│ Caching & Queue │ Redis 7 (In-Memory, O(1), Pub/Sub, TTL, Versioning)  │
│ Object Storage  │ MinIO / AWS S3 (Lưu File Đính Kèm, Flat Namespace)   │
└─────────────────┴──────────────────────────────────────────────────────┘
```

### 1.1 Tại sao TeamHub không chọn MongoDB (NoSQL)?
Nhiều lập trình viên mới bắt đầu thường nghĩ NoSQL lưu JSON nhanh và tiện hơn. Tuy nhiên, đối với một ứng dụng quản lý dự án và Kanban như TeamHub, **chọn NoSQL thuần túy là một sai lầm nghiêm trọng về mặt kiến trúc**:
1. **Dữ liệu có tính quan hệ hình cây chặt chẽ (Relational Integrity):**
   * Cây thực thể của TeamHub: `User` $\rightarrow$ `WorkspaceMember` $\rightarrow$ `Workspace` $\rightarrow$ `Board` $\rightarrow$ `List` $\rightarrow$ `Card` $\rightarrow$ `[Checklist, Comment, Attachment, Activity]`.
   * Đây là mô hình chuẩn mực của đại số quan hệ. Nếu dùng NoSQL:
     * Bạn phải tự viết code kiểm tra khóa ngoại (Foreign Keys) ở tầng ứng dụng.
     * Khi xóa một Board hoặc một List, nếu mạng chập chờn, rất dễ sinh ra hàng nghìn bản ghi rác mồ côi (Orphan Records) trong cơ sở dữ liệu.
     * RDBMS xử lý việc này triệt để bằng ràng buộc `FOREIGN KEY ... ON DELETE CASCADE` ở cấp độ nhân cơ sở dữ liệu.
2. **Nhu cầu giao dịch nguyên tử (ACID Transactions):**
   * Khi di chuyển một thẻ qua danh sách khác hoặc gán nhãn hàng loạt, hệ thống bắt buộc phải cập nhật nhiều bảng cùng lúc trong một Transaction duy nhất. RDBMS xử lý việc này hoàn hảo với chi phí tài nguyên tối thiểu.
3. **Truy vấn phân tích và tổng hợp (Analytical Rollups):**
   * Các báo cáo đo lường hiệu suất (như `board_metrics_daily` trong TeamHub) yêu cầu các phép tính `JOIN`, `GROUP BY`, `COUNT`, `AVG` phức tạp trên các tập dữ liệu lớn. RDBMS với bộ tối ưu hóa chi phí (Cost-Based Query Optimizer) vượt trội hoàn toàn so với NoSQL Aggregation Pipeline.

### 1.2 Tại sao chọn PostgreSQL thay vì MySQL?
* **Kiểu dữ liệu native phong phú:**
  * Hỗ trợ kiểu `UUID` nhị phân 128-bit nguyên bản (chỉ chiếm 16 bytes trên đĩa, trong khi MySQL lưu chuỗi `CHAR(36)` tốn 36 bytes và làm phình to B-Tree Index).
  * Hỗ trợ kiểu số thực độ chính xác tuyệt đối `DECIMAL / NUMERIC` lên tới 1000 chữ số (TeamHub dùng `Decimal(65, 30)` cho thuật toán vị trí Fractional Indexing).
  * Kiểu dữ liệu nhị phân `JSONB` với khả năng đánh chỉ mục GIN (Generalized Inverted Index), cho phép vừa có cấu trúc chặt chẽ của RDBMS vừa có tính linh hoạt của NoSQL khi cần.
* **Tuân thủ chuẩn ANSI-SQL khắt khe:** Postgres tuân thủ nghiêm ngặt tiêu chuẩn ANSI-SQL, không có các hành vi ngầm khó kiểm soát (như ngầm ép kiểu dữ liệu hoặc tự ý cắt ngắn chuỗi) giống như một số phiên bản MySQL mặc định.
* **Khả năng mở rộng (Extensibility):** Hỗ trợ Custom Extensions mạnh mẽ (`pg_stat_statements`, `pgcrypto`, `uuid-ossp`, `pgvector`).

---

## 2. Bốn Trụ Cột ACID Trong PostgreSQL

Mọi thao tác ghi dữ liệu trong TeamHub đều được đảm bảo bởi 4 tính chất sống còn của **ACID**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   A.C.I.D GUARANTEES IN TEAMHUB                        │
├────────────────────────────────────────────────────────────────────────┤
│  [A] Atomicity   : Tất cả hoặc không gì cả (All or Nothing)            │
│  [C] Consistency : Dữ liệu luôn tuân thủ toàn vẹn ràng buộc Schema     │
│  [I] Isolation   : Các giao dịch đồng thời không giẫm đạp lên nhau     │
│  [D] Durability  : Đã commit là an toàn tuyệt đối trên đĩa qua WAL     │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Atomicity (Tính nguyên tử):**
   * Khi gọi `prisma.$transaction` để tạo một Workspace mới, hệ thống chèn 1 bản ghi vào bảng `workspaces` và 1 bản ghi vào `workspace_members` với quyền `OWNER`.
   * Nếu bước 2 gặp lỗi (ví dụ trùng khóa hoặc mất kết nối mạng), toàn bộ thao tác trong giao dịch lập tức được **Rollback** về trạng thái ban đầu. Không bao giờ tồn tại một Workspace "vô chủ" trong cơ sở dữ liệu.
2. **Consistency (Tính nhất quán):**
   * Dữ liệu chuyển từ một trạng thái hợp lệ này sang một trạng thái hợp lệ khác.
   * Mọi ràng buộc toàn vẹn dữ liệu: Khóa chính (`PRIMARY KEY`), Khóa ngoại (`FOREIGN KEY`), Ràng buộc duy nhất (`UNIQUE`), và Kiểu dữ liệu (`DATA TYPE`) đều được nhân DB kiểm tra trước khi xác nhận ghi.
3. **Isolation (Tính cô lập):**
   * Khi 100 người dùng cùng lúc tương tác trên một bảng Kanban, các giao dịch đang diễn ra không được phép nhìn thấy dữ liệu "dở dang" (chưa commit) của nhau hoặc làm sai lệch kết quả của nhau.
4. **Durability (Tính bền vững):**
   * Một khi câu lệnh `COMMIT` đã trả về thành công cho Client, dữ liệu được cam kết tồn tại vĩnh viễn trên đĩa cứng, kể cả khi máy chủ mất điện toàn bộ ngay 1 micro giây sau đó.

---

## 3. Kiến Trúc Bộ Nhớ & Tiến Trình (Memory & Process Architecture)

Hiểu rõ cấu trúc bên dưới của PostgreSQL giúp kỹ sư giải thích được cách dữ liệu di chuyển từ RAM xuống ổ đĩa:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      POSTGRESQL MEMORY ARCHITECTURE                    │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    SHARED MEMORY (RAM CHUNG)                     │  │
│  │  ┌─────────────────────────────────┐  ┌───────────────────────┐  │  │
│  │  │         SHARED BUFFERS          │  │      WAL BUFFERS      │  │  │
│  │  │  (Chứa các Page dữ liệu 8KB)    │  │ (Chứa WAL Record tạm) │  │  │
│  │  └─────────────────────────────────┘  └───────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │            LOCAL MEMORY (PER-BACKEND PROCESS MEMORY)             │  │
│  │   work_mem (Sắp xếp, Hash JOIN)  │ maintenance_work_mem (Vacuum) │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     TIẾN TRÌNH NỀN (BACKGROUND PROCESSES)              │
│                                                                        │
│   [Checkpointer]      ──► Đồng bộ định kỳ Shared Buffers ──► Đĩa cứng  │
│   [Background Writer] ──► Dọn dẹp các Dirty Pages để giải phóng RAM    │
│   [WAL Writer]        ──► Đẩy dữ liệu từ WAL Buffers ──► File WAL      │
│   [Autovacuum]        ──► Thu dọn Dead Tuples và cập nhật Statistics   │
│   [Stats Collector]   ──► Thu thập thông tin hiệu năng truy vấn        │
└────────────────────────────────────────────────────────────────────────┘
```

### Cấu trúc một trang dữ liệu (8KB Page/Block Layout):
PostgreSQL quản lý dữ liệu trên đĩa và trong RAM dưới các đơn vị trang chuẩn **8KB (8192 bytes)**:
* **Page Header (24 bytes):** Chứa LSN (Log Sequence Number), con trỏ ranh giới vùng nhớ trống (`pd_lower`, `pd_upper`).
* **Item Identifiers / Line Pointers (4 bytes mỗi mục):** Mảng con trỏ trỏ tới vị trí của từng dòng dữ liệu (Tuple) thực tế trong trang.
* **Free Space:** Vùng nhớ trống ở giữa, thu hẹp dần khi có thêm dòng mới chèn vào.
* **Tuples (Rows):** Dữ liệu thực tế của các dòng được ghi ngược từ cuối trang lên trên (`pd_upper`).
* **`ctid` (Item Pointer):** Mỗi dòng trong Postgres có một địa chỉ vật lý duy nhất dạng `(block_number, tuple_index)`, ví dụ `(0, 1)` nghĩa là dòng thứ 1 nằm ở trang số 0.

---

## 4. Cơ Chế MVCC (Multi-Version Concurrency Control) Chuyên Sâu

PostgreSQL không dùng cơ chế Read-Lock truyền thống để đảm bảo tính cô lập, mà sử dụng **MVCC (Kiểm soát đồng thời đa phiên bản)**.

> **Định lý cốt lõi của MVCC:**  
> *"Người đọc không bao giờ chặn người ghi, và người ghi không bao giờ chặn người đọc (Readers do not block Writers, and Writers do not block Readers)."*

### 4.1 Cấu Trúc Hàng Dữ Liệu & Các Cột Ẩn
Mỗi dòng dữ liệu trong bảng vật lý của PostgreSQL luôn chứa các trường tiêu đề ẩn (Header fields):
* `xmin`: Transaction ID (XID) của giao dịch đã **tạo ra** dòng này (qua lệnh `INSERT`).
* `xmax`: Transaction ID (XID) của giao dịch đã **xóa hoặc cập nhật** dòng này (qua lệnh `DELETE` hoặc `UPDATE`). Nếu dòng chưa bị xóa, `xmax` bằng `0`.
* `t_ctid`: Con trỏ trỏ tới vị trí vật lý hiện tại của dòng hoặc phiên bản mới hơn của dòng đó.

### 4.2 Kịch Bản Thực Tế: Thao Tác UPDATE Hoạt Động Thế Nào?
Khi lập trình viên thực hiện câu lệnh:
```sql
UPDATE cards SET title = 'Review Wireframes' WHERE id = 'card_1';
```

```
TRẠNG THÁI TRƯỚC KHI UPDATE (Transaction XID = 100 tạo ra dòng):
┌────────┬──────┬──────┬────────────────────────┬──────────┐
│  ctid  │ xmin │ xmax │ title                  │ Trạng thái│
├────────┼──────┼──────┼────────────────────────┼──────────┤
│ (0, 1) │ 100  │  0   │ "Draft Wireframes"     │ Còn sống │
└────────┴──────┴──────┴────────────────────────┴──────────┘

KHI TRANSACTION XID = 200 CHẠY LỆNH UPDATE:
Postgres KHÔNG GHI ĐÈ lên ô nhớ cũ! Nó thực hiện 2 bước:
1. Đánh dấu dòng cũ: Gán xmax = 200 (Báo hiệu đã bị thay thế bởi XID 200).
2. Tạo một dòng MỚI tại vị trí (0, 2): Gán xmin = 200, xmax = 0, title = 'Review Wireframes'.

┌────────┬──────┬──────┬────────────────────────┬──────────┐
│  ctid  │ xmin │ xmax │ title                  │ Trạng thái│
├────────┼──────┼──────┼────────────────────────┼──────────┤
│ (0, 1) │ 100  │ 200  │ "Draft Wireframes"     │ Dead     │
│ (0, 2) │ 200  │  0   │ "Review Wireframes"    │ Live     │
└────────┴──────┴──────┴────────────────────────┴──────────┘
```

👉 **Lợi ích thực tế:**  
Nếu có một câu lệnh báo cáo `SELECT * FROM cards` dài 30 giây được khởi chạy bởi Transaction `XID = 150`:
* Câu lệnh `SELECT` này đọc bảng và so sánh: Với dòng `(0, 1)`, nó thấy `xmin = 100 <= 150` và `xmax = 200 > 150` (chưa xảy ra tại thời điểm snapshot của nó) $\rightarrow$ **Nó vẫn đọc được dữ liệu cũ một cách nhất quán hoàn hảo!**
* Câu lệnh `SELECT` không hề bị khóa (Lock) và người dùng chạy lệnh `UPDATE` cũng không phải chờ đợi câu lệnh `SELECT` đọc xong.

### 4.3 Table Bloat & Tiến Trình Auto-Vacuum Daemon
Vì mỗi thao tác `UPDATE` và `DELETE` đều để lại các dòng cũ không còn ai nhìn thấy nữa (gọi là **Dead Tuples**), ổ đĩa sẽ gặp hiện tượng phình to vô ích (**Table Bloat**).

PostgreSQL giải quyết vấn đề này bằng tiến trình ngầm **Auto-Vacuum Daemon**:
1. **Thu hồi không gian trống (Vacuuming):** Quét qua các trang 8KB, nhận diện các Dead Tuples mà không còn Transaction nào hoạt động cần xem nữa, giải phóng vùng nhớ đó để các câu lệnh `INSERT` tương lai tái sử dụng lại (không trả lại dung lượng file cho OS, trừ khi chạy lệnh khóa bảng `VACUUM FULL`).
2. **Cập nhật dữ liệu thống kê (Analyzing):** Tự động cập nhật bảng thống kê phân phối dữ liệu `pg_statistic`, giúp bộ lập kế hoạch truy vấn (**Query Planner**) quyết định xem nên dùng Index Scan hay Sequential Scan.
3. **Chống tràn vòng lặp Transaction ID (XID Wraparound Prevention):** Transaction ID trong Postgres là số nguyên 32-bit (khoảng 4 tỷ ID). Khi đạt ngưỡng 2 tỷ giao dịch, tiến trình Vacuum bắt buộc phải chạy cơ chế "Freeze" để reset các XID cũ thành trạng thái vĩnh cửu, ngăn chặn thảm họa cơ sở dữ liệu chuyển sang chế độ Read-Only để tự vệ.

---

## 5. Các Cấp Độ Cô Lập Giao Dịch (Transaction Isolation Levels)

Chuẩn ANSI SQL định nghĩa 4 cấp độ cô lập. Bảng dưới đây thể hiện cách PostgreSQL triển khai trên thực tế:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        CÁC CẤP ĐỘ CÔ LẬP TRONG POSTGRESQL                              │
├────────────────────┬──────────────┬──────────────────┬──────────────┬──────────────────┤
│ Cấp Độ Cô Lập      │ Dirty Read   │ Non-repeatable   │ Phantom Read │ Serialization    │
│ (Isolation Level)  │ (Đọc rác)    │ Read (Đọc đổi)   │ (Đọc bóng ma)│ Anomaly (Bất thg)│
├────────────────────┼──────────────┼──────────────────┼──────────────┼──────────────────┤
│ Read Uncommitted   │ Không thể*   │ Có thể           │ Có thể       │ Có thể           │
│ Read Committed (Mặc định)│ Không  │ Có thể           │ Có thể       │ Có thể           │
│ Repeatable Read    │ Không        │ Không thể        │ Không thể**  │ Có thể           │
│ Serializable       │ Không        │ Không thể        │ Không thể    │ Không thể        │
└────────────────────┴──────────────┴──────────────────┴──────────────┴──────────────────┤
│ * Trong Postgres, Read Uncommitted được đối xử y hệt Read Committed do bản chất MVCC.  │
│ ** Khác với MySQL/Oracle, Repeatable Read của Postgres chặn ĐƯỢC cả Phantom Reads!     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Hiện tượng bất thường thực tế:
1. **Dirty Read (Đọc rác):** Giao dịch T1 sửa dữ liệu nhưng chưa COMMIT. Giao dịch T2 đọc được dữ liệu sửa đó. Sau đó T1 ROLLBACK. Dữ liệu T2 đã đọc là dữ liệu rác không có thực. (PostgreSQL loại trừ hoàn toàn lỗi này nhờ MVCC).
2. **Non-repeatable Read (Đọc không lặp lại):** Giao dịch T1 đọc một dòng. Giao dịch T2 UPDATE dòng đó và COMMIT. Giao dịch T1 đọc lại dòng đó và thấy giá trị đã bị đổi khác.
3. **Phantom Read (Đọc bóng ma):** Giao dịch T1 đọc danh sách thẻ: `SELECT * FROM cards WHERE list_id = 'L1'` (trả về 5 thẻ). Giao dịch T2 chèn thêm 1 thẻ mới vào danh sách `L1` và COMMIT. Giao dịch T1 đọc lại câu lệnh trên và thấy xuất hiện 6 thẻ (xuất hiện thêm "bóng ma").
4. **Serialization Anomaly (Bất thường tuần tự hóa):** Kết quả khi chạy đồng thời nhiều giao dịch khác với bất kỳ thứ tự chạy tuần tự nào (ví dụ: Write Skew).

### Cấu hình trong TeamHub:
Mặc định TeamHub chạy ở cấp độ **`Read Committed`** (mỗi câu lệnh SQL trong transaction nhìn thấy snapshot dữ liệu tại thời điểm câu lệnh đó bắt đầu chạy). Khi cần tính toán tài chính hoặc kiểm tra tồn kho tuyệt đối, hệ thống có thể nâng lên `Repeatable Read` hoặc `Serializable` thông qua tùy chọn của Prisma:
```typescript
await prisma.$transaction(async (tx) => {
  // Logic nghiệp vụ khắt khe
}, {
  isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
});
```

---

## 6. Cơ Chế Khóa (Lock Contention) & Advisory Locks

Khi hai người dùng đồng thời chỉnh sửa cùng một dữ liệu, hệ thống điều phối xung đột qua hệ thống Khóa (Locks).

### 6.1 Khóa Cấp Độ Dòng (Row-Level Locks)
PostgreSQL cung cấp 4 chế độ khóa dòng chính:
* `FOR UPDATE`: Khóa mạnh nhất. Chặn mọi giao dịch khác cố gắng `UPDATE`, `DELETE`, hoặc dùng `FOR UPDATE / FOR SHARE` trên dòng này. Thường dùng khi muốn đọc dữ liệu lên để tính toán rồi cập nhật ngay sau đó (Pessimistic Locking).
* `FOR NO KEY UPDATE`: Tương tự `FOR UPDATE` nhưng không chặn khóa ngoại (không đổi cột Primary Key/Unique). Đây là loại khóa mặc định khi chạy câu lệnh `UPDATE` thông thường.
* `FOR SHARE`: Khóa chia sẻ, cho phép nhiều người cùng đọc nhưng không ai được phép sửa.
* `FOR KEY SHARE`: Cho phép người khác sửa các cột không thuộc khóa chính.

```sql
-- Ví dụ: Khóa một thẻ để xử lý kéo thả di chuyển vị trí, chống xung đột song song:
SELECT * FROM cards WHERE id = 'card_123' FOR UPDATE;
```

### 6.2 Khóa Tư Vấn Ứng Dụng (PostgreSQL Advisory Locks)
Đây là một "viên ngọc quý" của PostgreSQL mà rất ít lập trình viên biết tận dụng.  
Thay vì phải cài đặt Redis Redlock phức tạp để làm Khóa phân tán (Distributed Lock), PostgreSQL cho phép bạn tạo **khóa phân tán cấp ứng dụng** ngay trong cơ sở dữ liệu bằng các hàm `pg_advisory_lock`:

```sql
-- Xin khóa giao dịch theo một số nguyên 64-bit đại diện cho tài nguyên:
SELECT pg_advisory_xact_lock(hashtext('workspace_billing_ws_123'));
```
* **Đặc điểm:** Không hề khóa bất kỳ dòng dữ liệu nào trong bảng.
* **Tự động giải phóng:** Hàm `pg_advisory_xact_lock` sẽ tự động nhả khóa ngay khi Transaction kết thúc (dù thành công hay thất bại rollback), triệt tiêu hoàn toàn nỗi lo Deadlock khi ứng dụng bị crash.

### 6.3 Phát Hiện Deadlock (Deadlock Detection)
Khi Giao dịch A giữ Khóa 1 và chờ Khóa 2, trong khi Giao dịch B giữ Khóa 2 và chờ Khóa 1:
* PostgreSQL có bộ phát hiện Deadlock ngầm điều khiển bởi thông số `deadlock_timeout` (mặc định 1 giây).
* Sau 1 giây chờ, Postgres sẽ quét đồ thị phụ thuộc (Wait-for Graph). Nếu phát hiện chu trình lặp vô tận (Cycle), nó sẽ tự động hủy (Aborts) một trong hai giao dịch với mã lỗi `40P01 (deadlock_detected)` để giải phóng hệ thống.

---

## 7. Write-Ahead Logging (WAL) — Cơ Chế Bảo Vệ Độ Bền (Durability)

Tại sao PostgreSQL có thể xử lý hàng chục nghìn giao dịch mỗi giây mà không làm chậm ổ đĩa?

```
┌────────────────────────────────────────────────────────────────────────┐
│                   QUY TRÌNH GHI DỮ LIỆU QUA WAL                        │
│                                                                        │
│   Client Lệnh Ghi (INSERT/UPDATE)                                      │
│         │                                                              │
│         ▼                                                              │
│   1. Ghi thay đổi vào WAL Buffer (RAM) & Cập nhật Shared Buffers (RAM) │
│         │                                                              │
│         ▼                                                              │
│   2. Ghi tuần tự xuống Đĩa: WAL Log File (Sequential Disk I/O)         │
│         │                                                              │
│         ▼                                                              │
│   3. Báo COMMIT Thành Công Cho Client! (Độ trễ < 1ms)                 │
│                                                                        │
│   ... (Vài phút sau hoặc khi WAL đầy) ...                              │
│   4. CHECKPOINTER thong thả đẩy các Dirty Pages từ Shared Buffers      │
│      xuống các Data File chính (Random Disk I/O)                       │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Sequential I/O vs Random I/O:**  
   Ghi trực tiếp vào file dữ liệu chính là ghi ngẫu nhiên (Random Write) vì các dòng nằm rải rác trên nhiều file khác nhau, tốc độ rất chậm. Ghi vào WAL là ghi nối đuôi tuần tự (Append-only Sequential Write), tốc độ nhanh gấp hàng trăm lần.
2. **Tiến trình Checkpoint:**  
   Định kỳ (điều khiển bởi `checkpoint_timeout` và `max_wal_size`), Checkpointer sẽ đồng bộ toàn bộ các trang dữ liệu đã bị sửa đổi trong RAM (Dirty Pages) xuống đĩa cứng và đánh dấu mốc kiểm tra (Checkpoint Redo Point).
3. **Khôi phục sau thảm họa (Crash Recovery):**  
   Nếu máy chủ bị rút phích điện đột ngột: Khi bật lại, PostgreSQL chỉ cần mở file WAL từ vị trí Checkpoint gần nhất và "phát lại" (Replay) toàn bộ các thay đổi chưa kịp ghi xuống file dữ liệu. Cơ sở dữ liệu trở lại trạng thái nguyên vẹn 100%.

---

## 8. Đọc Hiểu Kế Hoạch Thực Thi (EXPLAIN ANALYZE)

Để gỡ lỗi và tối ưu hóa các câu truy vấn chậm (Slow Queries) trong TeamHub, lập trình viên sử dụng công cụ phân tích kế hoạch thực thi:

```sql
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM cards WHERE list_id = 'list_123' ORDER BY position ASC;
```

```
                                                       QUERY PLAN
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 Index Scan using idx_cards_list_position on cards  (cost=0.29..8.31 rows=1 width=320) (actual time=0.035..0.038 rows=12 loops=1)
   Index Cond: (list_id = 'list_123'::uuid)
   Buffers: shared hit=3
 Planning Time: 0.145 ms
 Execution Time: 0.058 ms
```

### Các chỉ số quan trọng cần phân tích:
1. **Loại quét dữ liệu (Scan Type):**
   * `Seq Scan (Sequential Scan)`: Quét từ đầu đến cuối toàn bộ bảng. Chấp nhận được nếu bảng có dưới vài trăm dòng, nhưng là thảm họa nếu bảng có hàng trăm nghìn dòng.
   * `Index Scan`: Dùng B-Tree Index để tìm con trỏ vật lý (`ctid`), sau đó nhảy tới trang dữ liệu để lấy dòng.
   * `Index Only Scan`: Cực kỳ tối ưu! Toàn bộ các cột cần `SELECT` đều nằm ngay trong B-Tree Index. Không cần đọc tới bảng vật lý (yêu cầu Visibility Map sạch không có dead tuples).
   * `Bitmap Index Scan + Bitmap Heap Scan`: Quét index tạo ra một mảng bitmap các trang cần đọc, sau đó đọc các trang đó theo thứ tự vật lý để hạn chế nhảy đầu đọc đĩa ngẫu nhiên.
2. **Chi phí ước tính (`cost=0.29..8.31`):**
   * Số đầu tiên (`0.29`): Startup cost - chi phí tính toán trước khi trả về dòng đầu tiên.
   * Số thứ hai (`8.31`): Total cost - chi phí ước tính để đọc hết toàn bộ kết quả.
   * Đơn vị tính được quy đổi dựa trên cấu hình: `seq_page_cost = 1.0`, `random_page_cost = 4.0`, `cpu_tuple_cost = 0.01`.
3. **Thống kê bộ đệm (`Buffers: shared hit=3`):**
   * `shared hit=3`: Cả 3 trang 8KB cần đọc đều đã nằm sẵn trong RAM Shared Buffers (tốc độ đọc RAM tính bằng nanosecond).
   * `shared read=N`: Số trang phải đọc trực tiếp từ ổ cứng SSD/HDD (tốn microsecond/millisecond).

---

## 🎯 Góc Nhìn Phỏng Vấn (Interview Cheatsheet)

### Câu hỏi 1: "Cơ chế MVCC trong PostgreSQL hoạt động như thế nào và tại sao nó giúp cải thiện thông lượng đọc/ghi?"
* **Trả lời:**  
  "MVCC (Multi-Version Concurrency Control) trong PostgreSQL hoạt động dựa trên nguyên tắc không ghi đè dữ liệu trực tiếp lên đĩa khi có thao tác `UPDATE` hoặc `DELETE`. Thay vào đó, mỗi thay đổi sẽ tạo ra một phiên bản mới của dòng dữ liệu (Tuple) và đánh dấu phiên bản cũ bằng các trường tiêu đề ẩn `xmin` (ID transaction tạo dòng) và `xmax` (ID transaction xóa/thay thế dòng).  
  Mỗi câu truy vấn khi thực thi sẽ có một Transaction Snapshot để xác định phiên bản nào của dòng là hợp lệ đối với nó. Nhờ vậy, **người đọc không bao giờ chặn người ghi, và người ghi không bao giờ chặn người đọc**. Điều này loại bỏ hoàn toàn hiện tượng nghẽn khóa đọc (Read Locks) truyền thống, giúp hệ thống phục vụ hàng nghìn truy vấn đồng thời với thông lượng cao."

### Câu hỏi 2: "Tại sao PostgreSQL cần tiến trình Auto-Vacuum và điều gì sẽ xảy ra nếu tắt tiến trình này?"
* **Trả lời:**  
  "Do cơ chế MVCC không xóa đè dữ liệu, các bản ghi cũ sau khi bị xóa hoặc cập nhật sẽ trở thành 'Dead Tuples' chiếm chỗ vô ích trên ổ đĩa. Tiến trình **Auto-Vacuum** chạy ngầm để đảm nhận 3 nhiệm vụ sống còn:
  1. Dọn dẹp và thu hồi không gian của các Dead Tuples để các lệnh `INSERT` sau này tái sử dụng lại, ngăn chặn hiện tượng phình to bảng (Table Bloat).
  2. Phân tích và cập nhật số liệu thống kê (`ANALYZE`) vào bảng `pg_statistic`, giúp bộ Query Planner tính toán đường đi truy vấn chính xác nhất.
  3. Đóng băng các Transaction ID cũ (Transaction Freezing) để ngăn chặn thảm họa tràn số vòng lặp Transaction ID 32-bit (XID Wraparound).  
  Nếu tắt Auto-Vacuum: Bảng và Index sẽ phình to gấp nhiều lần, dung lượng đĩa cạn kiệt, các câu truy vấn bị chậm nghiêm trọng do bộ Planner chọn sai kế hoạch, và cuối cùng cơ sở dữ liệu sẽ tự động cưỡng chế chuyển sang chế độ Read-Only để tự bảo vệ khi XID chạm mốc 2 tỷ."

### Câu hỏi 3: "Viết-Ahead Logging (WAL) là gì và đóng vai trò gì trong việc đảm bảo tính Durability?"
* **Trả lời:**  
  "WAL (Write-Ahead Logging) là cơ chế đảm bảo tính bền vững (Durability) trong ACID bằng cách áp dụng nguyên tắc: Mọi thay đổi dữ liệu phải được ghi tuần tự vào nhật ký WAL trên đĩa cứng trước khi dữ liệu thực tế được cập nhật vào các trang dữ liệu chính.  
  Vì việc ghi log vào WAL là thao tác ghi nối đuôi tuần tự (Sequential I/O), nó diễn ra cực nhanh so với việc ghi ngẫu nhiên (Random I/O) vào các file dữ liệu phân tán. Nhờ có WAL, PostgreSQL có thể xác nhận `COMMIT` thành công cho Client ngay lập tức. Nếu máy chủ bị sập nguồn đột ngột, tiến trình Crash Recovery khi khởi động lại chỉ cần đọc các bản ghi WAL từ điểm kiểm tra (Checkpoint) gần nhất để khôi phục lại toàn bộ dữ liệu chính xác 100%."
