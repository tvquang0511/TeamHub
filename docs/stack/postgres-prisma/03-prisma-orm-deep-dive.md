# 03 - Prisma ORM Chuyên Sâu (Rust Query Engine & N+1 Prevention)

---

## 1. Bản Chất Kiến Trúc Của Prisma ORM

Khác biệt hoàn toàn so với các ORM truyền thống viết thuần bằng JavaScript (như TypeORM hay Sequelize), **Prisma ORM** được thiết kế với kiến trúc lai (Hybrid Architecture) gồm hai thành phần tách biệt:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NODE.JS / TYPESCRIPT LAYER                      │
│   - TypeScript Type-Safety 100% (Sinh từ schema.prisma)                │
│   - prisma.boards.findUnique({ where: { id }, include: { lists: true }})│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Giao tiếp qua Node-API / IPC)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   PRISMA QUERY ENGINE (VIẾT BẰNG RUST)                 │
│                                                                        │
│   ┌─────────────────────┐   ┌───────────────────────────────────────┐  │
│   │ Query AST Parser    │──►│ Query Optimizer & Batching DataLoader │  │
│   └─────────────────────┘   └───────────────────┬───────────────────┘  │
│                                                 ▼                      │
│   ┌─────────────────────┐   ┌───────────────────────────────────────┐  │
│   │ Connection Pooler   │◄──│ SQL Dialect Generator (PostgreSQL)    │  │
│   └──────────┬──────────┘   └───────────────────────────────────────┘  │
└──────────────┼─────────────────────────────────────────────────────────┘
               │ (Chạy SQL qua kết nối TCP vật lý)
               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          POSTGRESQL DATABASE                           │
└────────────────────────────────────────────────────────────────────────┘
```

1. **TypeScript Client Layer:**
   * Cung cấp khả năng **Type-Safety 100% tại thời điểm Compile Time**. Mọi thay đổi trong schema (`schema.prisma`) khi chạy `npx prisma generate` sẽ tự động cập nhật Type definitions trong IDE.
   * Lập trình viên không bao giờ gặp lỗi sai chính tả tên cột, sai kiểu dữ liệu hay truy cập trường không tồn tại ở Runtime.
2. **Rust Query Engine:**
   * Trái tim xử lý logic truy vấn được biên dịch thành mã máy nhị phân bằng ngôn ngữ **Rust**.
   * Chịu trách nhiệm phân tích cú pháp truy vấn, tối ưu hóa đường đi, gom nhóm truy vấn (Batching), sinh câu lệnh SQL chuẩn cho PostgreSQL và quản lý Connection Pool.
   * Mang lại tốc độ biên dịch câu lệnh cực nhanh và mức tiêu thụ bộ nhớ RAM thấp hơn nhiều so với việc parse JSON/AST bằng JavaScript engine (V8).

---

## 2. Giải Quyết Vấn Nạn N+1 Bằng Cơ Chế Query Batching

### 2.1 Lỗ hổng kinh điển: Vấn nạn N+1 Query
Giả sử bạn cần lấy danh sách 10 Bảng (Boards) và toàn bộ các Cột (Lists) thuộc về từng bảng đó.
Trong cách viết ngây thơ hoặc các ORM thế hệ cũ:
```typescript
// ❌ CÂU LỆNH 1: Lấy danh sách 10 bảng
const boards = await getBoards(); 

// ❌ N CÂU LỆNH TIẾP THEO: Chạy vòng lặp truy vấn DB 10 lần!
for (const board of boards) {
  board.lists = await getListsByBoard(board.id); // Query 2, 3, 4 ... 11!
}
```
* **Hậu quả:** Để lấy 10 bảng, hệ thống phải thực hiện **$1 + 10 = 11$ lần khứ hồi mạng (Round-trips)** xuống Database. Nếu có 100 bảng, sẽ là 101 câu truy vấn $\rightarrow$ Hệ thống bị nghẽn mạng, Database cạn kiệt Connection Pool và sập máy chủ!

---

### 2.2 Cách Prisma tự động tối ưu bằng Batching & DataLoader
Khi bạn viết câu lệnh với mệnh đề `include`:
```typescript
const boards = await prisma.boards.findMany({
  where: { workspaceId: 'ws_123' },
  include: { lists: true },
});
```

Rust Query Engine của Prisma **KHÔNG** dùng lệnh `JOIN` thô và cũng **KHÔNG** chạy vòng lặp $N+1$. Thay vào đó, nó tự động tối ưu thành **ĐÚNG 2 CÂU LỆNH SQL DUY NHẤT**:
```sql
-- CÂU LỆNH 1: Lấy tất cả các Board thuộc Workspace
SELECT "id", "title", "workspace_id" 
FROM "boards" 
WHERE "workspace_id" = 'ws_123';

-- CÂU LỆNH 2: Gom toàn bộ ID của các Board trên thành một mệnh đề IN duy nhất
SELECT "id", "title", "board_id", "position" 
FROM "lists" 
WHERE "board_id" IN ('b_01', 'b_02', 'b_03', 'b_04', ...);
```

Sau khi nhận kết quả từ 2 câu lệnh trên, Rust Query Engine thực hiện việc ghép các List vào đúng đối tượng Board tương ứng ngay trong RAM trước khi trả kết quả về cho Node.js.

### 2.3 Vì sao Prisma chọn 2 câu lệnh `IN (...)` thay vì SQL `LEFT JOIN`?
Rất nhiều người thắc mắc: *"Tại sao không dùng 1 câu lệnh `JOIN` duy nhất cho nhanh?"*  
Đây là một quyết định kiến trúc sâu sắc nhằm ngăn chặn **Hội chứng phình to tích Descartes (Cartesian Product Row Duplication)**:
* Giả sử 1 Board có 10 Danh sách, mỗi Danh sách có 50 Thẻ.
* Nếu dùng `JOIN` 3 bảng trong một câu lệnh duy nhất: Cơ sở dữ liệu sẽ trả về $1 \times 10 \times 50 = \mathbf{500\text{ dòng dữ liệu}}$ qua đường truyền mạng! Trong đó, tiêu đề và thông tin của Board bị lặp lại 500 lần vô ích, làm tốn băng thông mạng và RAM giải mã của Node.js.
* Sử dụng chiến lược **Batching với `IN`**: Tổng số dòng truyền tải chỉ là $1 + 10 + 50 = \mathbf{61\text{ dòng}}$, giảm tới 88% lượng dữ liệu vô ích!

---

## 3. Quản Lý Kết Nối & Tối Ưu Hóa Connection Pool

### 3.1 Công Thức Tính Connection Pool Của Prisma
Mặc định, Prisma tự động tính toán kích thước Connection Pool theo công thức:
$$\text{connection\_limit} = \text{num\_physical\_cpus} \times 2 + 1$$
Ví dụ máy chủ có 4 CPU Cores, Prisma sẽ mở tối đa $4 \times 2 + 1 = 9$ kết nối TCP thường trực tới PostgreSQL.

### 3.2 Hiện tượng cạn kiệt Pool (Pool Exhaustion):
Nếu lượng request đồng thời quá lớn vượt quá số connection có sẵn:
```
PrismaClientKnownRequestError: Timed out fetching a new connection from the connection pool.
(More info: http://pris.ly/d/connection-pool-timeout)
```

Bạn có thể tùy chỉnh kích thước pool thông qua chuỗi kết nối:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/teamhub?connection_limit=20&pool_timeout=10"
```

### 3.3 Tích Hợp PgBouncer Trong Môi Trường Production
Khi chạy nhiều container Backend Node.js (ví dụ 10 pods, mỗi pod 10 connections = 100 connections), PostgreSQL bắt đầu bị nghẽn do mỗi connection trong Postgres tiêu tốn khoảng 10MB RAM và chi phí tạo tiến trình OS riêng.

**Giải pháp: Dùng bộ quản lý kết nối trung gian (PgBouncer) ở chế độ Transaction Pooling**:
* Trong `schema.prisma` và file `.env`, khi kết nối qua PgBouncer ở Transaction Mode, bạn **bắt buộc phải thêm tham số `pgbouncer=true`**:
```env
DATABASE_URL="postgresql://user:pass@pgbouncer:6432/teamhub?pgbouncer=true&connection_limit=1"
```
* **Lý do kỹ thuật:** Chế độ Transaction Pooling của PgBouncer sẽ đổi kết nối vật lý ngay sau mỗi transaction. Nếu không khai báo `pgbouncer=true`, Prisma sẽ cố gắng sử dụng tính năng **Prepared Statements** (câu lệnh SQL biên dịch sẵn gắn liền với Session), dẫn đến lỗi `prepared statement "s0" already exists` hoặc `prepared statement does not exist`!

---

## 4. Giao Dịch An Toàn (Prisma Interactive Transactions)

### 4.1 Phân biệt 2 dạng Transaction trong Prisma:
1. **Sequential Transaction (Mảng tuần tự):**
   ```typescript
   await prisma.$transaction([
     prisma.cards.update({ where: { id: cardId }, data: { listId: newListId } }),
     prisma.activity_logs.create({ data: { action: 'MOVE_CARD', cardId } }),
   ]);
   ```
   * **Cách hoạt động:** Gửi danh sách câu lệnh xuống DB trong một transaction duy nhất. Rất nhanh, thời gian giữ connection cực ngắn.
2. **Interactive Transaction (Giao dịch tương tác):**
   ```typescript
   await prisma.$transaction(async (tx) => {
     const card = await tx.cards.findUnique({ where: { id: cardId } });
     if (!card) throw new NotFoundException();
     
     // Cần đọc dữ liệu ở bước 1 để tính toán cho bước 2:
     await tx.cards.update({
       where: { id: cardId },
       data: { position: calculateNewPos(card.position) },
     });
   }, {
     maxWait: 2000, // Thời gian tối đa chờ lấy connection từ pool (2s)
     timeout: 5000,  // Thời gian tối đa transaction được phép chạy (5s)
   });
   ```

### 4.2 CẢNH BÁO NGUY HIỂM: Lỗi "Bỏ đói Connection Pool" (Connection Starvation)
> **Quy tắc sinh tử khi viết Interactive Transaction:**  
> **TUYỆT ĐỐI KHÔNG BAO GIỜ** gọi các tác vụ I/O bên ngoài (gửi HTTP request, upload S3/MinIO, gửi Email, chạy lệnh Redis chậm) bên trong callback của `prisma.$transaction`!

* **Nguyên nhân:** Khi bắt đầu `prisma.$transaction(async (tx) => ...)`, Prisma sẽ **giữ chặt một kết nối DB vật lý từ Connection Pool** cho riêng transaction đó cho tới khi hàm async kết thúc.
* Nếu bạn gọi một API thanh toán bên thứ ba mất 4 giây bên trong transaction, kết nối DB đó sẽ bị "đóng băng" suốt 4 giây.
* Chỉ cần 10 người dùng thanh toán cùng lúc, toàn bộ 10 kết nối trong Connection Pool sẽ bị chiếm dụng $\rightarrow$ Toàn bộ trang web TeamHub bị tê liệt ngay lập tức!

---

## 5. Truy Vấn Raw SQL An Toàn Với `prisma.$queryRaw`

Khi cần thực hiện các câu truy vấn phân tích phức tạp hoặc sử dụng các tính năng riêng của PostgreSQL mà Prisma Schema chưa hỗ trợ (ví dụ: Window Functions, CTEs, Recursive Queries):

```typescript
// ✅ CÁCH LÀM AN TOÀN TUYỆT ĐỐI (Tagged Template Literal):
const boardId = req.params.id;
const results = await prisma.$queryRaw<DailyMetric[]>`
  SELECT 
    date_trunc('day', created_at) AS day,
    COUNT(*) AS total_cards
  FROM cards
  WHERE board_id = ${boardId}::uuid
  GROUP BY day
  ORDER BY day DESC;
`;
```

### Tại sao cú pháp trên chống được 100% SQL Injection?
Nhiều lập trình viên lầm tưởng `${boardId}` là nối chuỗi JavaScript thông thường.  
**Thực chất không phải!** Đây là tính năng **Tagged Template Literal** của ES6. Prisma nhận diện các biến bên trong `${...}` và tự động chuyển đổi chúng thành các tham số truy vấn có tham số hóa (**Parameterized Query** `$1, $2` trong PostgreSQL). Kẻ tấn công dù có truyền chuỗi độc hại như `' OR '1'='1` cũng chỉ được coi là một giá trị chuỗi thuần túy!

---

## 🎯 Góc Nhìn Phỏng Vấn (Interview Cheatsheet)

### Câu hỏi 1: "Prisma ORM có kiến trúc như thế nào và cách nó xử lý bài toán N+1 Query là gì?"
* **Trả lời:**  
  "Prisma ORM có kiến trúc hai tầng: Tầng ứng dụng TypeScript cung cấp Type-safety tuyệt đối tại compile-time, và tầng **Rust Query Engine** được biên dịch thành mã máy chạy ngầm để quản lý kết nối và biên dịch truy vấn.  
  Để giải quyết vấn nạn N+1 Query, khi chúng ta gọi mệnh đề `include`, Prisma không chạy vòng lặp ngây thơ và cũng không lạm dụng SQL `JOIN` (vốn gây phình to dữ liệu Cartesian Product). Thay vào đó, Rust Engine áp dụng cơ chế **Query Batching**: Gom toàn bộ ID của bản ghi cha lại và thực hiện một truy vấn duy nhất tới bảng con với mệnh đề `IN (...)`. Nhờ đó, số lượng câu truy vấn luôn được giữ cố định ở mức hằng số $O(1)$ (luôn luôn là 2 câu lệnh), tối ưu hóa cả băng thông mạng lẫn thời gian xử lý."

### Câu hỏi 2: "Tại sao việc gọi một API bên thứ ba hoặc upload file S3 bên trong Interactive Transaction của Prisma là một lỗi kiến trúc nghiêm trọng?"
* **Trả lời:**  
  "Trong Prisma, khi một Interactive Transaction (`prisma.$transaction(async (tx) => ...)`) được khởi tạo, nó sẽ chiếm giữ độc quyền một kết nối TCP vật lý từ Connection Pool cho đến khi callback trả về kết quả hoặc bị lỗi.  
  Nếu chúng ta đưa các tác vụ I/O bên ngoài có độ trễ cao và khó đoán (như gọi HTTP bên thứ ba, tải file S3, gửi email) vào bên trong transaction, kết nối DB đó sẽ bị phong tỏa trong suốt thời gian chờ đợi. Điều này dẫn đến hiện tượng **Connection Starvation (Bỏ đói Connection Pool)**: Chỉ cần một số lượng nhỏ request diễn ra đồng thời là toàn bộ Connection Pool của hệ thống sẽ bị cạn kiệt, khiến mọi truy vấn khác của toàn bộ ứng dụng bị treo và timeout."

### Câu hỏi 3: "Khi triển khai hệ thống có sử dụng PgBouncer kết nối với Prisma ở chế độ Transaction Pooling, ta cần cấu hình gì và tại sao?"
* **Trả lời:**  
  "Khi sử dụng PgBouncer ở chế độ Transaction Pooling, chúng ta bắt buộc phải thêm tham số `?pgbouncer=true` vào chuỗi kết nối `DATABASE_URL` của Prisma.  
  Lý do là ở chế độ Transaction Pooling, PgBouncer sẽ thu hồi kết nối vật lý của Postgres ngay khi transaction kết thúc và cấp phát kết nối đó cho client khác. Mặc định, Prisma sử dụng tính năng Prepared Statements (câu lệnh biên dịch sẵn lưu trong Session kết nối). Nếu không bật `pgbouncer=true`, Prisma sẽ cố gọi lại Prepared Statement trên một kết nối vật lý mới mà câu lệnh đó chưa từng được chuẩn bị, dẫn đến lỗi runtime `prepared statement does not exist`. Tham số `pgbouncer=true` báo cho Prisma tắt Prepared Statements cấp Session để tương thích hoàn toàn với PgBouncer."
