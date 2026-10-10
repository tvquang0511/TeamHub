# 02 - Thiết Kế Schema & Tối Ưu Hóa Chỉ Mục (Schema Design & Indexing)

---

## 1. Quyết Định Thiết Kế Khóa Chính: UUID vs Auto-Increment vs UUIDv7

Trong file cấu hình [`backend/prisma/schema.prisma`](file:///d:/projects/persional-projects/Teamhub/backend/prisma/schema.prisma), mọi bảng trong TeamHub đều sử dụng khóa chính dạng **UUID**:
```prisma
model users {
  id    String   @id @default(uuid()) @db.Uuid
}
```

```
┌────────────────────────────────────────────────────────────────────────┐
│                   SO SÁNH 3 CHIẾN LƯỢC KHÓA CHÍNH (PRIMARY KEY)        │
├─────────────────┬──────────────────┬─────────────────┬─────────────────┤
│ Tiêu chí        │ Serial (Auto-Inc)│ UUIDv4 (Random) │ UUIDv7 (Time)   │
├─────────────────┼──────────────────┼─────────────────┼─────────────────┤
│ Kích thước lưu  │ 4 hoặc 8 bytes   │ 16 bytes nhị phân│ 16 bytes nhị phân│
│ Tính dự đoán    │ Cực kỳ dễ đoán   │ Hoàn toàn ngẫu  │ Có thể suy đoán │
│ (Predictability)│ (1, 2, 3...)     │ nhiên (122 bits)│ thời gian tạo   │
│ Khả năng sinh   │ Phải chờ DB cấp  │ Client/Worker tự│ Client/Worker tự│
│ Client-side     │ số (Tập trung)   │ sinh trước được │ sinh trước được │
│ Hiệu năng B-Tree│ Rất cao (Luôn ghi│ Phân mảnh trang │ Rất cao (Ghi    │
│ khi chèn mới    │ nối tiếp đuôi)   │ (Page splits)   │ tuần tự theo giờ)│
└─────────────────┴──────────────────┴─────────────────┴─────────────────┘
```

### 1.1 Tại sao không dùng số nguyên tự tăng (`BIGINT / SERIAL`)?
1. **Chống tấn công thu thập dữ liệu (ID Enumeration / Scraping Attack):**  
   Nếu sử dụng số nguyên tự tăng, đường link xem bảng hoặc thẻ sẽ có dạng `GET /api/boards/105`. Kẻ xấu chỉ cần viết một kịch bản đơn giản `for (id = 1; id <= 10000; id++)` là có thể quét toàn bộ cơ sở dữ liệu và suy ra được: công ty có bao nhiêu khách hàng, tốc độ tạo dự án mỗi ngày. Với UUID ngẫu nhiên 128-bit (`b2c8a06e-5f33-4db6-9e90-2c7b508f7311`), việc đoán mò ID là bất khả thi về mặt xác suất.
2. **Khả năng sinh ID phân tán (Decoupled Generation):**  
   Client hoặc tiến trình Worker có thể tự sinh sẵn ID hợp lệ (ví dụ: `crypto.randomUUID()`) trước khi gửi giao dịch xuống DB, giúp sinh các Job ID bất đồng bộ, tracking ID, hoặc tạo cây thực thể cha con lồng nhau trong bộ nhớ mà không cần chờ DB trả về ID cha.

### 1.2 Bí quyết tối ưu của PostgreSQL với UUID:
* Khác với MySQL lưu UUID dưới dạng chuỗi văn bản `CHAR(36)` tốn tới 36 bytes đĩa cứng và làm chỉ mục chậm chạp, PostgreSQL hỗ trợ **Kiểu dữ liệu native `@db.Uuid`**:
* Postgres lưu UUID dưới dạng **nhị phân 128-bit (chỉ tốn đúng 16 bytes)**, giúp kích thước B-Tree Index nhỏ hơn một nửa và tốc độ so sánh khóa nhanh tương đương số nguyên lớn!

---

## 2. Kiểu Dữ Liệu `Decimal(65, 30)` Cho Vị Trí Thẻ (Position)

Trong bảng `cards` và `lists`:
```prisma
model cards {
  position   Decimal   @db.Decimal(65, 30)
}
```

### 2.1 Căn bệnh của kiểu số thực `Float` (IEEE 754)
Nếu lập trình viên dùng kiểu `Float` (`float8` / `double precision`), máy tính biểu diễn số thực theo dạng cơ số 2 với số bit hữu hạn, gây ra hiện tượng sai số làm tròn số học (Floating-point precision issue):
```javascript
console.log(0.1 + 0.2); // Output: 0.30000000000000004
```
Trong thuật toán **Fractional Indexing** (Kéo thả thẻ vào giữa hai thẻ có vị trí $P_{prev}$ và $P_{next}$):
$$P_{new} = \frac{P_{prev} + P_{next}}{2}$$
Nếu người dùng kéo thả hàng chục lần vào cùng một khoảng hẹp, sai số làm tròn của `Float` sẽ khiến phép chia bị kịch trần độ chính xác, dẫn đến $P_{new} == P_{prev}$ $\rightarrow$ **Hai thẻ có vị trí giống hệt nhau, gây lỗi giao diện bị nhảy loạn xạ!**

### 2.2 Sức mạnh của `DECIMAL / NUMERIC` trong PostgreSQL
* Kiểu `DECIMAL` trong PostgreSQL là kiểu số thực chính xác tuyệt đối (Exact Numeric Type).
* Cấu hình `Decimal(65, 30)` nghĩa là:
  * Tổng cộng tối đa 65 chữ số có nghĩa (Precision).
  * Cho phép tới **30 chữ số sau dấu thập phân (Scale)**.
* Điều này đảm bảo bạn có thể thực hiện phép chia đôi vị trí hơn **100 lần liên tiếp** trong cùng một khe hẹp mà không bao giờ gặp xung đột vị trí!

---

## 3. Bản Chất Của B-Tree Index (Cây B-Tree Cân Bằng)

Chỉ mục mặc định trong PostgreSQL là **B-Tree (Balanced Tree)**. Để viết truy vấn tối ưu, lập trình viên cần hiểu cấu trúc vật lý của B-Tree:

```
                          ┌────────────────────────┐
                          │       ROOT PAGE        │
                          │   [ Keys: 100 | 500 ]  │
                          └───────┬────────┬───────┘
                                  │        │
             ┌────────────────────┘        └─────────────────────┐
             ▼                                                   ▼
  ┌──────────────────────┐                           ┌──────────────────────┐
  │  INTERNAL PAGE 1     │                           │  INTERNAL PAGE 2     │
  │  [ Keys: 20 | 60 ]   │                           │  [ Keys: 250 | 400 ] │
  └──────┬───────┬───────┘                           └──────┬───────┬───────┘
         │       │                                          │       │
    ┌────┘       └────┐                                ┌────┘       └────┐
    ▼                 ▼                                ▼                 ▼
┌──────────────┐  ┌──────────────┐                 ┌──────────────┐  ┌──────────────┐
│  LEAF PAGE 1 │◄─┼─►LEAF PAGE 2 │◄───────────────►│  LEAF PAGE 3 │◄─┼─►LEAF PAGE 4 │
│ [Key:10->ctid│  │ [Key:35->ctid│                 │ [Key:120->cti│  │ [Key:300->cti│
│  Key:15->ctid│  │  Key:50->ctid│                 │  Key:200->cti│  │  Key:450->cti│
└──────────────┘  └──────────────┘                 └──────────────┘  └──────────────┘
```

1. **Cấu trúc 3 tầng:**
   * **Root Page & Internal Pages:** Chứa các khóa phân nhánh để điều hướng tìm kiếm với độ phức tạp $O(\log N)$.
   * **Leaf Pages (Các trang lá):** Chứa cặp giá trị `(Key Value, ctid)`. Trong đó `ctid` là con trỏ trỏ trực tiếp tới vị trí vật lý của dòng trong bảng dữ liệu.
2. **Danh sách liên kết hai chiều (Doubly Linked List):**  
   Các trang lá được nối với nhau bằng con trỏ hai chiều (`prev` và `next`). Khi chạy các câu lệnh tìm kiếm theo khoảng hoặc sắp xếp:
   ```sql
   SELECT * FROM cards WHERE position BETWEEN 100 AND 500 ORDER BY position ASC;
   ```
   Postgres chỉ cần tìm tới vị trí bắt đầu trên Leaf Page, sau đó duyệt tuần tự qua các trang lá kế tiếp mà không cần duyệt lại từ Root Page!

---

## 4. Quy Tắc Tiền Tố Bên Trái (The Leftmost Prefix Rule)

Khi tạo một chỉ mục tổng hợp gồm nhiều cột (Composite Index):
```sql
CREATE INDEX idx_workspace_members ON workspace_members (workspace_id, role);
```

B-Tree sẽ sắp xếp dữ liệu: **Ưu tiên sắp xếp cột 1 (`workspace_id`) trước, nếu cột 1 trùng nhau mới tiếp tục sắp xếp theo cột 2 (`role`)**.

```
┌───────────────────────────────┬────────────────────────────────────────┐
│ CÂU TRUY VẤN (WHERE CLAUSE)   │ CÓ DÙNG ĐƯỢC CHỈ MỤC idx KHÔNG?        │
├───────────────────────────────┼────────────────────────────────────────┤
│ WHERE workspace_id = 'ws_1'   │ ✅ CÓ (Tận dụng tiền tố cột đầu tiên)   │
│ WHERE workspace_id = 'ws_1'   │ ✅ CÓ (Tận dụng hoàn hảo cả 2 cột)     │
│   AND role = 'ADMIN'          │                                        │
│ WHERE role = 'ADMIN'          │ ❌ KHÔNG (Vi phạm Leftmost Prefix Rule!│
│                               │   Postgres buộc phải quét toàn bộ bảng)│
└───────────────────────────────┴────────────────────────────────────────┘
```

> **Quy tắc vàng khi chọn thứ tự cột trong Composite Index:**  
> 1. Đặt các cột tìm kiếm **so sánh bằng (`=`)** có độ phân tán cao (High Cardinality) lên đầu tiên.  
> 2. Đặt các cột tìm kiếm theo **khoảng (`>`, `<`, `BETWEEN`)** hoặc dùng để `ORDER BY` ở cuối cùng.

---

## 5. Chiến Lược Chỉ Mục Sống Còn Của TeamHub

### 5.1 Chỉ Mục Khóa Ngoại (Foreign Key Indexing)
Một sự thật nguy hiểm mà rất nhiều lập trình viên không biết:  
**PostgreSQL KHÔNG TỰ ĐỘNG TẠO INDEX cho các cột Khóa Ngoại (Foreign Key Columns)!**

Nếu bảng `card_comments` có trường `card_id` tham chiếu tới bảng `cards`:
```prisma
model card_comments {
  cardId   String  @map("card_id") @db.Uuid
  // BẮT BUỘC PHẢI KHAI BÁO INDEX NÀY:
  @@index([cardId], map: "idx_card_comments_card_id")
}
```

**Điều gì xảy ra nếu thiếu index trên `card_id`?**
1. Mọi câu lệnh lấy bình luận của thẻ: `SELECT * FROM card_comments WHERE card_id = ?` đều phải quét toàn bộ bảng (`Seq Scan`).
2. Khi xóa một Card (`DELETE FROM cards WHERE id = ?`), Postgres phải kiểm tra khóa ngoại để kích hoạt `ON DELETE CASCADE`. Vì không có index, Postgres sẽ **khóa toàn bộ bảng `card_comments` (ShareLock)** để quét từng dòng, gây nghẽn toàn bộ hệ thống!

### 5.2 Ràng Buộc Kép Độc Nhất (Composite Unique Constraints)
Bảo vệ tính toàn vẹn dữ liệu ở cấp độ phần cứng database, loại bỏ hoàn toàn lỗi trùng lặp dữ liệu do Race Condition:
```prisma
// 1 User chỉ được thuộc về 1 Workspace đúng 1 lần:
@@unique([workspaceId, userId], map: "uq_workspace_members_workspace_user")

// 1 Board chỉ có đúng 1 bản ghi số liệu thống kê cho mỗi ngày:
@@unique([boardId, date], map: "uq_board_metrics_daily_board_date")
```

### 5.3 Chỉ Mục Cắt Tỉa Một Phần (Partial Index)
Trong bảng `refresh_tokens`, 95% token trong bảng là các token cũ đã hết hạn hoặc đã bị thu hồi (`revoked_at IS NOT NULL`).  
Nếu đánh index thông thường trên toàn bộ cột `token`, dung lượng index sẽ phình to hàng trăm MB.

**Giải pháp: Partial Index (Chỉ index các dòng còn hoạt động):**
```sql
CREATE INDEX idx_active_refresh_tokens 
ON refresh_tokens (token) 
WHERE revoked_at IS NULL AND expires_at > NOW();
```
* **Kích thước Index siêu nhỏ:** Giảm 90% dung lượng RAM cần dùng cho Index.
* **Tốc độ xác thực cực nhanh:** Các truy vấn xác thực token đăng nhập chỉ quét qua tập con các token còn sống.

---

## 6. Xóa Lan Truyền An Toàn (`onDelete: Cascade`)

Trong quan hệ Kanban phân cấp sâu:
```prisma
model cards {
  list   lists  @relation(fields: [listId], references: [id], onDelete: Cascade)
}
```

* **Ưu điểm kiến trúc:**  
  Khi người dùng xóa một Danh sách (List) hoặc xóa một Dự án (Board), nhân PostgreSQL sẽ tự động kích hoạt tiến trình xóa sạch toàn bộ các thẻ con, bình luận, và tệp đính kèm liên quan mà không cần Backend phải viết hàng chục vòng lặp xóa thủ công.
* **Bảo vệ toàn vẹn tuyệt đối:**  
  Không bao giờ có nguy cơ để sót dữ liệu rác mồ côi (Orphan Records) khi một tiến trình Backend bị crash giữa chừng.

---

## 🎯 Góc Nhìn Phỏng Vấn (Interview Cheatsheet)

### Câu hỏi 1: "Tại sao trong PostgreSQL chúng ta bắt buộc phải tự đánh Index cho các cột Khóa Ngoại (Foreign Key)?"
* **Trả lời:**  
  "Khác với MySQL tự động sinh index khi khai báo Foreign Key, PostgreSQL không tự động làm việc này. Nếu chúng ta không tạo index cho cột khóa ngoại, hai vấn đề nghiêm trọng sẽ xảy ra:  
  1. Các câu truy vấn `JOIN` hoặc lọc dữ liệu theo khóa ngoại (`WHERE parent_id = ?`) sẽ phải quét tuần tự toàn bộ bảng (Sequential Scan), làm tăng thời gian phản hồi theo cấp số nhân khi dữ liệu lớn.  
  2. Khi xóa hoặc cập nhật bản ghi cha ở bảng chính, PostgreSQL phải kiểm tra xem có bản ghi con nào tham chiếu tới không (hoặc thực hiện `CASCADE DELETE`). Do thiếu index ở bảng con, PostgreSQL buộc phải khóa và quét tuần tự toàn bộ bảng con, gây hiện tượng nghẽn khóa (Lock Contention) và làm tê liệt hệ thống."

### Câu hỏi 2: "Quy tắc Leftmost Prefix trong Composite Index là gì và nó ảnh hưởng thế nào đến thiết kế bảng?"
* **Trả lời:**  
  "Quy tắc Tiền tố bên trái (Leftmost Prefix Rule) phát biểu rằng: Một chỉ mục tổng hợp trên các cột `(A, B, C)` chỉ có thể được sử dụng để tối ưu truy vấn nếu điều kiện `WHERE` lọc theo các tiền tố liên tục từ trái qua phải của chỉ mục đó, tức là: lọc theo `(A)`, lọc theo `(A, B)`, hoặc lọc theo `(A, B, C)`.  
  Nếu câu truy vấn chỉ lọc theo `(B)` hoặc `(C)` mà không có `(A)`, B-Tree sẽ không thể định vị nhánh cây hiệu quả và buộc phải quét toàn bộ bảng. Do đó, khi thiết kế thứ tự các cột trong Composite Index, chúng ta phải đưa các cột thường xuyên được truy vấn bằng phép so sánh bằng (`=`) và có độ phân tán cao lên trước, sau đó mới đến các cột lọc theo khoảng (`>`, `<`) hoặc các cột sắp xếp (`ORDER BY`)."

### Câu hỏi 3: "Tại sao em chọn `Decimal(65, 30)` thay vì `Float` để lưu vị trí thẻ (Position) trong tính năng Kanban kéo thả?"
* **Trả lời:**  
  "Kiểu `Float` trong máy tính sử dụng chuẩn IEEE 754 biểu diễn dấu phẩy động nhị phân, dẫn đến hiện tượng sai số làm tròn số học (Rounding Error). Trong thuật toán Fractional Indexing, khi người dùng liên tục kéo thả thẻ vào giữa hai thẻ khác nhau, hệ thống liên tục thực hiện phép chia đôi vị trí. Sau nhiều lần chia, sai số của `Float` sẽ làm hai thẻ khác nhau có giá trị vị trí giống hệt nhau, gây lỗi giao diện.  
  Trong khi đó, `Decimal / Numeric` trong PostgreSQL là kiểu số thực chính xác tuyệt đối. Định dạng `Decimal(65, 30)` cho phép chứa tới 30 chữ số sau dấu thập phân, đảm bảo thực hiện phép chia đôi hàng trăm lần liên tiếp mà không bao giờ bị trùng lặp vị trí."
