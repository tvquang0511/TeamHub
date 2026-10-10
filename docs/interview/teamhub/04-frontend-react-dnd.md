# TeamHub — React DnD (drag & drop + move algorithm)

## 1) React DnD là gì?
- Thư viện cho phép build drag-and-drop bằng React hooks.
- Trong TeamHub, nó được dùng cho:
  - kéo list trong board
  - kéo card giữa các list

## 2) Vì sao TeamHub chọn React DnD?
- Vì board kiểu Kanban có tương tác kéo thả rất tự nhiên.
- Dễ kiểm soát logic drop theo từng component.
- Cho phép custom khá sâu: drop zone, hover, intent before/after, end-of-list.

## 3) Cách TeamHub tổ chức DnD
### 3.1 Root provider
File: `frontend/src/app/features/board/pages/BoardPage.tsx`
- Bọc toàn bộ board trong `DndProvider`.
- Dùng `HTML5Backend`.

### 3.2 Hai loại drag chính
- `LIST`
- `CARD`

### 3.3 Dữ liệu drag item
- List item: chỉ cần `id`
- Card item: `id` + `listId`

## 4) Drag list
File: `frontend/src/app/features/board/components/ListColumn.tsx`

### 4.1 List là draggable
- Dùng `useDrag` với type `LIST`.
- `canDrag` phụ thuộc quyền viết board.

### 4.2 Drop list
- List khác có thể drop vào một column.
- Khi drop, TeamHub tính xem user muốn chèn **before** hay **after** target list.
- Từ đó parent tính `prevId/nextId` rồi gọi API move.

### 4.3 Vì sao phải tính intent before/after?
- Chỉ biết “thả lên column” là chưa đủ.
- Nếu không có intent thì dễ gây no-op hoặc reorder sai.
- Cách này giúp list behavior giống card drop semantics.

## 5) Drag card
File: `frontend/src/app/features/board/components/CardItem.tsx`

### 5.1 Card là draggable
- Dùng `useDrag` với type `CARD`.
- Item truyền đi gồm `id` và `listId`.

### 5.2 Card cũng là drop target
- Card nhận drop từ card khác.
- Khi thả lên card hiện tại, hệ thống tính vị trí tương đối:
  - nếu cursor nằm nửa trên card → `hoverAbove = true`
  - nếu cursor nằm nửa dưới card → `hoverAbove = false`

### 5.3 `hoverAbove` dùng để làm gì?
- Để xác định chèn trước hay sau card target.
- Đây là nền tảng cho move algorithm dựa trên `prevCardId/nextCardId`.

## 6) End-of-list drop zone
File: `frontend/src/app/features/board/components/ListColumn.tsx`

TeamHub có thêm drop zone ở cuối list để người dùng có thể thả card xuống cuối mà không cần hover một card cụ thể.

## 7) Move algorithm của card
Trong `handleCardDropped`:
1. Lấy target list chứa card đang hover.
2. Lọc bỏ temp card.
3. Sắp xếp card theo `position`.
4. Xác định index drop.
5. Tính `prevCardId` và `nextCardId`.
6. Gọi API move với `toListId`, `prevCardId`, `nextCardId`.

### Ý nghĩa phỏng vấn
- Frontend không tự tính position cuối cùng bằng số cứng.
- Frontend chỉ gửi “ý định chèn ở đâu” để backend tính position chuẩn hơn.

## 8) Move algorithm của list
Trong `BoardPage.tsx`:
- Board page commit list drop.
- Từ `dragListId`, `dropTargetListId`, `intent before/after`, parent tính ra `prevId/nextId`.
- Sau đó gọi API move list.

## 9) Vì sao không reorder hoàn toàn ở client?
- Vì backend vẫn là source of truth.
- Frontend chỉ làm optimistic update để UI mượt.
- Backend mới là nơi tính position Decimal giữa các item.

## 10) Chống drop lặp / drop sai
### 10.1 `monitor.didDrop()`
- Dùng để tránh nested drop firing hai lần.

### 10.2 Không cho kéo thả khi read-only
- `canDrag` và `canDrop` phụ thuộc `canWrite`.

### 10.3 Không cho drag chính nó
- Card drop bỏ qua khi `item.id === card.id`.
- List drop bỏ qua khi `item.id === list.id`.

## 11) Optimistic UI trong drag & drop
TeamHub kết hợp DnD với React Query:
- mutate xong thì UI được update ngay bằng cache.
- nếu lỗi thì rollback.
- nếu cần thì invalidate để refetch.

## 12) Tương tác với quyền
- `canWriteBoard` quyết định có được kéo thả hay không.
- Nếu board chỉ xem thì drag/drop bị khóa.

## 13) Các điểm dễ bị hỏi
### 13.1 Vì sao cần `position` thay vì index?
- Index dễ phải renumber nhiều.
- `position` kiểu Decimal cho phép chèn giữa mà ít đổi dữ liệu.

### 13.2 `hoverAbove` được tính như thế nào?
- Dựa vào cursor Y so với giữa card target.

### 13.3 Vì sao drag list cần intent before/after?
- Vì chỉ drop vào column chưa đủ thông tin vị trí cuối.

### 13.4 Backend có cần biết drag UI details không?
- Không. Backend chỉ nhận prev/next và tự tính position.

## 14) Câu trả lời ngắn trong phỏng vấn
> TeamHub dùng React DnD cho cả list và card. Với card, em tính hoverAbove dựa trên vị trí cursor để xác định chèn trước hay sau; với list thì còn có intent before/after. Frontend chỉ gửi ý định `prev/next`, còn backend là nơi tính position Decimal cuối cùng. Em cũng kết hợp optimistic update qua React Query để kéo thả mượt nhưng vẫn có rollback khi lỗi.
