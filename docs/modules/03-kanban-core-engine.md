# 03 - Trái Tim Nghiệp Vụ Kanban & Thuật Toán Sắp Xếp (Kanban Core & Fractional Indexing)

---

## 1. Kiến Trúc Cấu Trúc Dữ Liệu Phân Cấp (Hierarchical Data Model)

Kanban Board là nghiệp vụ cốt lõi nhất của TeamHub. Cấu trúc dữ liệu trong cơ sở dữ liệu được tổ chức theo hình cây 4 tầng phân cấp chặt chẽ:

```
                            [ WORKSPACE ]
                                  │ 1:N
                                  ▼
                              [ BOARD ]
                                  │ 1:N
                                  ▼
                              [ LIST ] (Cột: To Do, In Progress, Done)
                                  │ 1:N
                                  ▼
                              [ CARD ] (Thẻ công việc)
                                  │ 1:N
         ┌────────────────┬───────┴────────┬────────────────┐
         ▼                ▼                ▼                ▼
   [ CHECKLIST ]    [ COMMENT ]      [ ATTACHMENT ]     [ LABEL ]
```

### Ràng buộc toàn vẹn trong Schema ([`prisma/schema.prisma`](file:///d:/projects/persional-projects/Teamhub/backend/prisma/schema.prisma)):
* Mỗi `List` bắt buộc thuộc về một `board_id`.
* Mỗi `Card` bắt buộc thuộc về một `list_id`.
* Khi một `Board` bị xóa, toàn bộ `List` và `Card` bên trong đều được dọn dẹp nhờ ràng buộc `onDelete: Cascade`.

---

## 2. Vấn Đề Kinh Điển: Sắp Xếp Thứ Tự Kéo Thả (Ordering Problem)

Khi người dùng kéo thả (Drag & Drop) một Thẻ hoặc một Cột trên giao diện Web, làm thế nào để lưu vị trí của nó vào Database?

### 2.1 Cách tiếp cận ngây thơ (Naive Integer Indexing)
Lưu vị trí bằng một số nguyên liên tục: `position = 1, 2, 3, 4, 5...`

```
Cột đang có 5 thẻ:
[Thẻ A (pos: 1)]  ──►  [Thẻ B (pos: 2)]  ──►  [Thẻ C (pos: 3)]  ──►  [Thẻ D (pos: 4)]  ──►  [Thẻ E (pos: 5)]
```

❌ **Thảm họa hiệu năng xuất hiện khi người dùng kéo Thẻ E chèn vào giữa Thẻ A và B:**
* Thẻ A giữ nguyên (`pos: 1`).
* Thẻ E đổi thành (`pos: 2`).
* **Hậu quả:** Bạn bắt buộc phải chạy lệnh cập nhật:
  ```sql
  UPDATE cards SET position = position + 1 WHERE list_id = '...' AND position >= 2;
  ```
* Nếu cột có **1.000 thẻ**, một thao tác kéo thả chuột nhỏ sẽ phát sinh **998 lệnh UPDATE**, gây khóa bảng (Row/Table Lock), ngốn I/O đĩa và làm đơ Database!

---

### 2.2 Giải Pháp Của TeamHub: Thuật Toán Số Thực (Fractional Indexing)

Thay vì dùng số nguyên, TeamHub lưu cột `position` dưới dạng **Số thập phân độ chính xác cao (`Decimal` / Postgres `numeric`)**.

```
PostgreSQL Schema:
model cards {
  position   Decimal   @db.Decimal(65, 30)
}
```

#### Nguyên lý toán học: Giữa 2 số thực bất kỳ luôn tồn tại vô số số thực khác!
$$\forall a, b \in \mathbb{R} \quad (a < b) \implies a < \frac{a + b}{2} < b$$

Khi người dùng kéo thả một thẻ chèn vào giữa 2 thẻ lân cận (`prev` và `next`):
$$\text{position}_{\text{new}} = \frac{\text{position}_{\text{prev}} + \text{position}_{\text{next}}}{2}$$

```
VÍ DỤ THỰC TẾ:
[Thẻ A (pos: 1000)]
         ▲
         │ (Chèn Thẻ mới vào giữa)  ──► position_mới = (1000 + 2000) / 2 = 1500
         ▼
[Thẻ B (pos: 2000)]
```
👉 **Độ phức tạp chỉ là $O(1)$:** Server **chỉ thực hiện đúng 1 câu lệnh `UPDATE` duy nhất** cho chiếc thẻ vừa được di chuyển. 999 thẻ còn lại trong cột hoàn toàn không bị ảnh hưởng!

---

## 3. Bóc Tách Hàm Tính Toán: `computeBetweenPosition`

Toàn bộ thuật toán được đóng gói độc lập tại [`backend/src/common/utils/position.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/common/utils/position.ts):

```typescript
export function computeBetweenPosition(
  prev: Prisma.Decimal | null | undefined,
  next: Prisma.Decimal | null | undefined,
): Prisma.Decimal {
  // TRƯỜNG HỢP 1: Chèn vào giữa 2 thẻ có sẵn (prev và next đều tồn tại)
  if (prev != null && next != null) {
    return prev.plus(next).dividedBy(new Prisma.Decimal(2));
  }

  // TRƯỜNG HỢP 2: Thả vào vị trí cuối cùng của danh sách (chỉ có prev, next là null)
  if (prev != null) {
    return prev.plus(new Prisma.Decimal(1));
  }

  // TRƯỜNG HỢP 3: Thả lên vị trí đầu tiên của danh sách (chỉ có next, prev là null)
  if (next != null) {
    return next.minus(new Prisma.Decimal(1));
  }

  // TRƯỜNG HỢP 4: Thả vào cột rỗng (chưa có thẻ nào)
  return new Prisma.Decimal(Date.now());
}
```

### Tại sao lại dùng thư viện `Prisma.Decimal` mà không dùng `Number` của JavaScript?
Trong JavaScript, kiểu số thực `number` (IEEE 754 float) chỉ có độ chính xác 64-bit (khoảng 15–17 chữ số thập phân). Nếu người dùng kéo thẻ vào giữa một vị trí quá nhiều lần, JavaScript sẽ bị làm tròn số (Floating Point Precision Loss) dẫn đến 2 thẻ có vị trí bằng nhau.

`Prisma.Decimal` (dựa trên thư viện `decimal.js`) hỗ trợ độ chính xác tùy biến không giới hạn, đảm bảo tính toán chia đôi hàng chục lần mà không bao giờ bị trùng vị trí.

---

## 4. Luồng Di Chuyển Thẻ Xuyên Cột (Cross-List Move Flow)

Di chuyển thẻ giữa 2 cột khác nhau là một trong những nghiệp vụ phức tạp nhất vì vừa phải kiểm tra tính toàn vẹn dữ liệu, vừa phải đảm bảo quyền hạn của người gọi.

Toàn bộ quy trình tại [`cards.service.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/cards/cards.service.ts#L310-L364):

```
[ Client ]
    │ (Gửi PUT /cards/:id/move)
    │ Payload: { destinationListId, prevId, nextId }
    ▼
[ BƯỚC 1: KIỂM TRA PHÂN QUYỀN & TENANT ISOLATION ]
- User có thuộc Workspace của Board nguồn không?
- User có quyền thao tác trên Board đích không?
- Board đích và Board nguồn có cùng thuộc một Workspace không? (Chống di chuyển thẻ lậu giữa 2 Workspace)
    │
    ▼
[ BƯỚC 2: VALIDATE VỊ TRÍ THẢ ]
- Thẻ prevId (nếu có) có thực sự đang nằm trong destinationListId không?
- Thẻ nextId (nếu có) có thực sự đang nằm trong destinationListId không?
    │
    ▼
[ BƯỚC 3: TÍNH TOÁN TOÁN HỌC ]
- newPosition = computeBetweenPosition(prev.position, next.position)
    │
    ▼
[ BƯỚC 4: THỰC THI GHI CƠ SỞ DỮ LIỆU ]
- cardsRepo.move(cardId, { listId: destinationListId, position: newPosition })
    │
    ▼
[ BƯỚC 5: TẠO AUDIT TRAIL & SIDE EFFECTS ]
- Tạo lịch sử hoạt động: activitiesRepo.createSafe(..., CARD_MOVED)
- Xóa cache chi tiết của riêng Card đó: cacheDel(cardDetailKey)
- Tăng version cache của Board nguồn: bumpBoardCacheVersion(sourceBoardId)
- Nếu di chuyển sang Board khác: bump luôn version của Board đích!
```

---

## 5. Vòng Đời Của Thẻ: Lưu Trữ (Archive) vs Xóa Cứng (Hard Delete)

TeamHub áp dụng triết lý quản lý tài nguyên của Jira và Trello: **Ưu tiên Lưu trữ (Archive/Soft-delete) thay vì Xóa vĩnh viễn**.

### 5.1 Lưu trữ Thẻ (Archive)
* Thẻ được đánh dấu `archivedAt = new Date()`.
* Khi tải màn hình Kanban Board (`boards.service.ts#getDetail`), query Prisma tự động lọc:
  ```typescript
  where: { archivedAt: null }
  ```
* **Lợi ích:** Thẻ biến mất khỏi giao diện làm việc giúp giảm rối mắt, nhưng toàn bộ lịch sử bình luận, checklist và file đính kèm vẫn được giữ nguyên. Người dùng có thể mở mục "Archived Items" để khôi phục (Restore) bất cứ lúc nào.

### 5.2 Xóa Cứng Thẻ (Hard Delete)
* Chỉ được thực hiện khi người dùng xác nhận xóa vĩnh viễn thẻ đã lưu trữ.
* Kích hoạt chuỗi dọn dẹp bất đồng bộ:
  1. Xóa bản ghi trong PostgreSQL (Cascade xóa checklists, comments, assignments).
  2. Các file đính kèm trên MinIO/S3 được đẩy vào BullMQ `blobs` queue để xóa vật lý sau 60 giây.

---

## 🎯 Góc Nhìn Phỏng Vấn (Interview Cheatsheet)

### Câu hỏi 1: "Tại sao bạn lại chọn giải pháp Fractional Indexing cho tính năng kéo thả thay vì lưu index nguyên 1, 2, 3?"
* **Trả lời:** "Nếu dùng số nguyên thông thường, mỗi lần người dùng chèn một thẻ lên đầu hoặc giữa danh sách, hệ thống phải chạy lệnh UPDATE hàng loạt cho toàn bộ các thẻ phía sau để dịch chuyển index ($O(N)$ write operations). Điều này tạo ra gánh nặng đĩa rất lớn và dễ gây khóa bảng khi có nhiều người cùng thao tác. Bằng cách sử dụng **Fractional Indexing** với kiểu số thực `Decimal`, vị trí mới luôn được tính bằng trung bình cộng vị trí của 2 thẻ kề bên $(\text{prev} + \text{next}) / 2$. Thao tác này có độ phức tạp là $O(1)$, tức là chỉ cần một câu lệnh UPDATE duy nhất vào thẻ vừa kéo mà không cần đụng tới bất kỳ thẻ nào khác."

### Câu hỏi 2: "Điều gì xảy ra nếu người dùng kéo thả thẻ vào cùng một khoảng giữa quá nhiều lần khiến độ chính xác thập phân bị cạn kiệt?"
* **Trả lời:** "Trong TeamHub, cột `position` được định nghĩa là `Decimal(65, 30)` trong PostgreSQL và tính toán qua thư viện `Prisma.Decimal` (Decimal.js) với 30 chữ số sau dấu phẩy. Về mặt lý thuyết, người dùng phải kéo thả chèn vào đúng vị trí đó liên tục hàng chục nghìn lần mới chạm tới giới hạn độ chính xác. Để xử lý trường hợp cực đoan đó trong tương lai, giải pháp chuẩn là triển khai cơ chế **Re-balance / Re-indexing**: Khi khoảng cách giữa 2 thẻ $|pos_{next} - pos_{prev}| < \epsilon$ (quá nhỏ), một job nền sẽ tự động đánh số lại toàn bộ thẻ trong cột đó cách đều nhau với bước nhảy chuẩn (ví dụ: 1000, 2000, 3000)."

👉 *Bước tiếp theo: Mời bạn mở file [`04-kanban-permissions-and-caching.md`](./04-kanban-permissions-and-caching.md) để tìm hiểu cách phân quyền hiển thị Board và cơ chế đồng bộ Cache Versioning.*
