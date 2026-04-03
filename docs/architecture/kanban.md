# Kanban architecture (Trello-like)

Tài liệu này mô tả cách TeamHub triển khai Kanban theo kiểu Trello: **Workspace → Board → List → Card**, cùng các khái niệm “member/role/visibility”, sắp xếp bằng **position float**, và đồng bộ realtime.

## 1) Scope
TeamHub tập trung các hành vi chính:
- Workspace: tạo/quản lý thành viên, lời mời
- Board: visibility (PRIVATE/WORKSPACE), thành viên board
- List: CRUD + reorder
- Card: CRUD + move/reorder + card detail (labels/assignees/checklists/comments/attachments/activity)
- Realtime: Socket.IO sync trạng thái board + chat panel

## 2) Domain model (khái niệm)
### 2.1 Workspace
- Là “boundary” chính về dữ liệu và authorization.
- Workspace có members (OWNER/ADMIN/MEMBER) và nhiều boards.

### 2.2 Board
- Thuộc workspace.
- Có `visibility`:
  - `PRIVATE`: chỉ **board members** được đọc/ghi.
  - `WORKSPACE`: **workspace members** được đọc; ghi khuyến nghị vẫn cần **board membership**.
- Board có members (OWNER/ADMIN/MEMBER).

### 2.3 List
- Thuộc board.
- Mỗi list có `position` để sắp xếp.

### 2.4 Card
- Thuộc list (và gián tiếp thuộc board/workspace).
- Card có `position` trong list.
- Card detail thường bao gồm:
  - description, due date
  - labels
  - assignees
  - checklists
  - comments
  - attachments
  - activity log

## 3) Authorization (tóm tắt)
Nguyên tắc triển khai nên theo 2 lớp:
- **Workspace membership**: điều kiện tối thiểu để truy cập dữ liệu trong workspace.
- **Board membership**: điều kiện để write vào board + truy cập PRIVATE boards.

Khuyến nghị:
- Tất cả API thao tác list/card đều phải resolve về `workspaceId` và kiểm tra membership trước.
- Socket join room `board:{boardId}` bắt buộc phải check board membership trước khi join.

Tài liệu chi tiết: xem [docs/architecture/security.md](security.md).

## 4) Ordering strategy: position float
TeamHub sử dụng “position float” để reorder/move mà không cần reindex thường xuyên.

### 4.1 Quy tắc tính position
Giả sử bạn muốn chèn một item vào giữa `prev` và `next` (đã cùng scope: cùng board cho list, cùng list cho card):
- Nếu có cả `prev` và `next`: $newPos = (prev.position + next.position)/2$
- Nếu kéo lên đầu: $newPos = next.position/2$
- Nếu kéo xuống cuối: $newPos = prev.position + 1024$
- Nếu danh sách rỗng: $newPos = 1024$

### 4.2 Rebalance (khi khoảng cách quá nhỏ)
Vấn đề: sau nhiều lần chèn, khoảng cách giữa 2 `position` có thể quá nhỏ.

Giải pháp:
- Nếu $|next - prev| < \epsilon$ (ví dụ `1e-7`) thì chạy **rebalance**:
  - Set lại position theo bước 1024: `1024, 2048, 3072, ...`

Khuyến nghị thực thi:
- MVP: rebalance sync (ít dữ liệu).
- Nâng cao: rebalance async (queue) và phát event `board:rebalance_done`.

## 5) Core flows
### 5.1 Load board detail
Frontend thường cần 1 “payload lớn” để render board:
- Board info
- Lists (sorted by position, unarchived)
- Cards theo list (sorted by position, unarchived)
- Members/labels (phục vụ assign/label trong UI)

Khuyến nghị:
- Có endpoint board detail (1 round-trip)
- Cache read-heavy payload (xem [docs/architecture/caching.md](caching.md))

### 5.2 Reorder list
- Input: `{ boardId, listId, prevListId?, nextListId? }`
- Validate: `prev/next` phải thuộc cùng board.
- Compute new position → update DB.
- Emit realtime event đến room `board:{boardId}`.

### 5.3 Move/reorder card
- Input: `{ cardId, toListId, prevCardId?, nextCardId? }`
- Validate:
  - `toListId` thuộc cùng board.
  - `prev/next` (nếu có) thuộc `toListId`.
- Update `listId` + `position`.
- Emit event `board:card_moved` (hoặc patch card state) đến room.

### 5.4 Card detail operations
Thường là các thao tác “nhẹ”, nên dùng API theo cardId:
- update fields (title/description/due)
- comments add/edit/delete
- checklist + checklist items
- labels/assignees
- attachments (presign + commit)
- activity feed

## 6) Realtime integration (Socket.IO)
### 6.1 Room
- Room chính: `board:{boardId}`
  - Kanban updates
  - Chat panel theo board

### 6.2 Event contracts
Tài liệu hợp đồng realtime: xem [docs/architecture/realtime-events.md](realtime-events.md).

Nguyên tắc:
- Server chỉ emit tới room liên quan (không broadcast global).
- Payload tối thiểu, đủ để client update state.
- Khi có “heavy updates” (ví dụ card detail), cân nhắc emit “invalidate” và để client refetch.

## 7) Data consistency notes
- Ưu tiên update DB trước, emit sau.
- Nếu client làm optimistic UI:
  - cần “rollback” khi server trả lỗi
  - hoặc dựa vào event từ server để reconcile.

## 8) Performance & operational notes
- Board detail dễ là endpoint “nặng” → caching + rate limiting.
- Nên index theo `(boardId, position)` cho lists và `(listId, position)` cho cards.
- Với drag-drop nhanh, nên debounce request phía client hoặc gom batch (phase sau).

## 9) Liên kết liên quan
- Realtime events: [docs/architecture/realtime-events.md](realtime-events.md)
- Security: [docs/architecture/security.md](security.md)
- Cache: [docs/architecture/caching.md](caching.md)
- Rate limiting: [docs/architecture/rate-limiting.md](rate-limiting.md)
