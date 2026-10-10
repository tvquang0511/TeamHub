# 04 - Phân Quyền Bảng Kanban & Cơ Chế Đồng Bộ Bộ Nhớ Đệm (Board RBAC & Cache Sync)

---

## 1. Mô Hình Phân Quyền Hai Lớp (Two-Tier RBAC Architecture)

Một điểm đặc sắc trong kiến trúc bảo mật của TeamHub là sự kết hợp giữa **Quyền hạn cấp Workspace (Workspace Role)** và **Quyền hạn cấp Board (Board Role)**.

```
┌────────────────────────────────────────────────────────┐
│                   WORKSPACE TIER                       │
│  Roles: OWNER | ADMIN | MEMBER                         │
└──────────────────────────┬─────────────────────────────┘
                           │ Thừa kế & Kiểm soát
                           ▼
┌────────────────────────────────────────────────────────┐
│                     BOARD TIER                         │
│  Visibility: WORKSPACE | PRIVATE                       │
│  Roles: OWNER | ADMIN | MEMBER (hoặc Non-Member)       │
└────────────────────────────────────────────────────────┘
```

### 1.1 Khái Niệm Hiển Thị (Board Visibility)
Mỗi bảng làm việc có một thuộc tính `visibility`:
1. **`WORKSPACE` (Công khai nội bộ):** Mọi thành viên trong Workspace đều có thể nhìn thấy bảng và tự động có quyền xem/thao tác cơ bản.
2. **`PRIVATE` (Riêng tư):** Chỉ những thành viên được đích danh mời vào bảng (`board_members`) mới được phép nhìn thấy và tương tác.

---

### 1.2 Chính Sách Giám Sát Của Doanh Nghiệp (Enterprise Safety Policy)
Trong môi trường doanh nghiệp thực tế, điều gì xảy ra nếu nhân viên tạo một Board `PRIVATE` để làm việc, nhưng người sáng lập công ty hoặc Giám đốc kỹ thuật (Workspace Owner / Admin) lại không thể vào xem tiến độ dự án?

TeamHub giải quyết bài toán này bằng chính sách **Workspace Admin Read-Only Policy** tại [`boards.service.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/boards/boards.service.ts#L62-L105):
* Nếu một bảng là `PRIVATE` và người dùng không phải là thành viên của bảng:
  * Nếu là nhân viên thông thường (`MEMBER` của Workspace) $\rightarrow$ **Giấu hoàn toàn sự tồn tại của Board (Trả về `404 Not Found`)**.
  * Nếu là `OWNER` hoặc `ADMIN` của Workspace $\rightarrow$ **Cho phép truy cập và đọc toàn bộ nội dung ở chế độ CHỈ ĐỌC (Read-Only)** với lý do `WORKSPACE_ADMIN_READ_ONLY`!

---

## 2. Bóc Tách Hàm Phân Quyền: `buildBoardActorPermissions`

Thay vì để giao diện Frontend tự đoán quyền hạn bằng các câu lệnh `if/else` rời rạc, Backend của TeamHub tính toán trước toàn bộ quyền hạn của người gọi thành một đối tượng chuẩn hóa mang tên **`actor`**:

```typescript
private buildBoardActorPermissions(params: {
  workspaceRole: "OWNER" | "ADMIN" | "MEMBER";
  boardVisibility: "PRIVATE" | "WORKSPACE";
  boardMemberRole?: "OWNER" | "ADMIN" | "MEMBER";
}) {
  const isBoardMember = Boolean(params.boardMemberRole);
  const isWorkspaceAdmin = params.workspaceRole === "OWNER" || params.workspaceRole === "ADMIN";
  const isBoardAdmin = params.boardMemberRole === "OWNER" || params.boardMemberRole === "ADMIN";

  // 1. Quyền đọc: Thấy nếu board mở, hoặc là thành viên, hoặc là Workspace Admin
  const canReadBoard = params.boardVisibility === "WORKSPACE" || isBoardMember || isWorkspaceAdmin;

  // 2. Quyền ghi (Tạo/sửa thẻ, kéo thả): Bắt buộc phải là Board Member
  const canWriteBoard = isBoardMember;

  // 3. Quyền quản trị Board: Yêu cầu là Board Admin/Owner
  const canManageBoardMembers = isBoardAdmin;
  const canInviteToBoard = isBoardAdmin;
  const canUpdateBoardSettings = isBoardAdmin;

  // 4. Quyền xóa Board: Board Admin HOẶC Workspace Admin đều có quyền xóa
  const canDeleteBoard = isBoardAdmin || isWorkspaceAdmin;
  const canLeaveBoard = isBoardMember;

  const readOnlyReason =
    canReadBoard && !canWriteBoard
      ? isWorkspaceAdmin && !isBoardMember
        ? "WORKSPACE_ADMIN_READ_ONLY"
        : "WORKSPACE_READ_ONLY"
      : null;

  return {
    isBoardMember,
    boardRole: params.boardMemberRole ?? null,
    canReadBoard,
    canWriteBoard,
    canManageBoardMembers,
    canInviteToBoard,
    canUpdateBoardSettings,
    canDeleteBoard,
    canLeaveBoard,
    readOnlyReason,
  };
}
```

👉 **Lợi ích kiến trúc:** Frontend chỉ việc đọc `actor.canWriteBoard` hay `actor.canDeleteBoard` để ẩn/hiện nút bấm trên giao diện mà không cần lặp lại logic phân quyền phức tạp.

---

## 3. Kiến Trúc Caching Board Payload & Kỹ Thuật Tách Biệt Quyền

Endpoint xem chi tiết Board ([`GET /boards/:id/detail`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/boards/boards.service.ts#L229-L291)) là endpoint tốn tài nguyên nhất hệ thống vì cần truy vấn:
1. Thông tin Board
2. Danh sách tất cả các Cột (Lists)
3. Danh sách tất cả các Thẻ (Cards) kèm nhãn đính kèm (CardLabels)
4. Danh sách thành viên (Members)
5. Danh sách các Nhãn khả dụng (Labels)

Nếu không có Cache, mỗi lượt mở trang hoặc F5 của người dùng sẽ kích hoạt **hàng chục câu truy vấn JOIN phức tạp** xuống PostgreSQL.

---

### 3.1 Quy Tắc Vàng: Tách Biệt Dữ Liệu Chung Khỏi Thông Tin Cá Nhân

```
                                  [ YÊU CẦU GET /boards/123/detail ]
                                                  │
                                                  ▼
                     ┌────────────────────────────────────────────────────────┐
                     │          ĐỌC REDIS: `cache:v1:board:123:detail:...`    │
                     │          Dữ liệu chung (Shared Payload):               │
                     │          - Lists: [ To Do, In Progress, Done ]         │
                     │          - Cards: [ 50 thẻ công việc ]                 │
                     │          - Members: [ 10 người tham gia ]              │
                     │          - Labels: [ Bug, Feature, Urgent ]            │
                     └────────────────────────────┬───────────────────────────┘
                                                  │ (Lấy ra trong 0.5ms)
                                                  ▼
                     ┌────────────────────────────────────────────────────────┐
                     │          TÍNH TOÁN ĐỘC LẬP TẦNG SERVICE (In-Memory)    │
                     │          Tính đối tượng `actor` riêng cho User hiện tại│
                     │          (Dựa trên role của chính họ)                  │
                     └────────────────────────────┬───────────────────────────┘
                                                  │
                                                  ▼
                                     [ GHÉP HAI PHẦN LẠI VỚI NHAU ]
                                     { ...cachedData, actor }
                                                  │
                                                  ▼
                                          [ TRẢ VỀ CLIENT ]
```

> ⚠️ **Tại sao không cache luôn cả `actor` vào trong Redis?**
> Nếu bạn lưu cả `actor` vào Redis, khi một **Admin** mở bảng, Redis sẽ lưu quyền Admin. Sau đó một **Viewer (Chỉ xem)** mở bảng, Redis trả về dữ liệu có sẵn kèm quyền Admin của người trước đó! Đây là lỗ hổng bảo mật rò rỉ quyền (**Privilege Escalation**) cực kỳ nguy hiểm.
> TeamHub giải quyết bằng cách: **Chỉ cache dữ liệu hiển thị chung; quyền hạn `actor` luôn được tính toán động theo từng request.**

---

## 4. Ma Trận Kích Hoạt Bump Version Cache

Nhờ cơ chế **Version-Stamping** (đã học ở Bài 02), bất cứ khi nào có thao tác ghi (Mutation) làm thay đổi cấu trúc bảng, Backend chỉ cần gọi lệnh `bumpBoardCacheVersion(boardId)` (lệnh `INCR` nguyên tử trên Redis):

```
Key Version: `cache:v1:board:{boardId}:ver`
```

### Danh mục tất cả các thao tác tự động tăng Version trong Codebase:

| Module | Thao tác ghi (Mutation) | Nơi kích hoạt code |
| :--- | :--- | :--- |
| **Lists** | Tạo cột mới, sửa tên cột, xóa cột | [`lists.service.ts#L43`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/lists/lists.service.ts#L43) |
| **Lists** | Kéo thả đổi vị trí cột (`reorder`) | [`lists.service.ts#L156`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/lists/lists.service.ts#L156) |
| **Cards** | Tạo thẻ mới, sửa tiêu đề, mô tả thẻ | [`cards.service.ts#L86`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/cards/cards.service.ts#L86) |
| **Cards** | Kéo thả di chuyển thẻ (`move`) | [`cards.service.ts#L358`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/cards/cards.service.ts#L358) |
| **Cards** | Gắn nhãn, gỡ nhãn, đổi màu thẻ | [`cards.service.ts#L535`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/cards/cards.service.ts#L535) |
| **Labels**| Tạo nhãn mới, sửa màu, xóa nhãn | [`labels.service.ts#L47`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/labels/labels.service.ts#L47) |
| **Boards**| Đổi tên bảng, đổi màu nền Kanban | [`boards.service.ts#L324`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/boards/boards.service.ts#L324) |
| **Boards**| Thêm/xóa thành viên bảng, đổi role | [`boards.service.ts#L225`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/boards/boards.service.ts#L225) |

---

## 5. Tầng Cache Riêng Cho Chi Tiết Thẻ (Card Detail Cache)

Ngoài bộ nhớ đệm toàn bảng (Board View), từng thẻ riêng lẻ còn có bộ nhớ đệm riêng khi người dùng click mở Popup xem chi tiết thẻ:

* **File:** [`backend/src/modules/cards/cards.service.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/cards/cards.service.ts)
* **Format Key:** `cache:v1:card:{cardId}:detail`
* **TTL:** 60 giây.
* **Chiến lược Invalidation:** Mỗi khi có thao tác chỉnh sửa thẻ (sửa hạn thẻ, thêm comment, checklist), service gọi xóa trực tiếp key đó:
  ```typescript
  await cacheDel(this.cardDetailCacheKey(cardId));
  ```
  đồng thời gọi `bumpBoardCacheVersion` để đồng bộ màn hình lớn bên ngoài.

---

## 🎯 Góc Nhìn Phỏng Vấn (Interview Cheatsheet)

### Câu hỏi 1: "Làm thế nào bạn giải quyết bài toán phân quyền người dùng khi dữ liệu được lưu trong bộ nhớ đệm Redis?"
* **Trả lời:** "Đây là một bài toán rất dễ mắc sai lầm về bảo mật. Trong hệ thống của em, em phân tách dữ liệu phản hồi thành 2 phần rõ rệt: **Dữ liệu tài nguyên chung** (danh sách cột, thẻ, nhãn của bảng) và **Dữ liệu quyền hạn của người gọi (`actor`)**. Bộ nhớ đệm Redis chỉ lưu trữ duy nhất phần dữ liệu tài nguyên chung. Khi có request gửi đến, hệ thống lấy dữ liệu chung từ Redis trong 0.5ms, sau đó tầng Service tính toán quyền `actor` của riêng người dùng đó dựa trên JWT xác thực, rồi ghép cả hai lại trước khi trả về. Cách làm này vừa tận dụng tối đa tốc độ của Cache, vừa triệt tiêu hoàn toàn nguy cơ rò rỉ quyền hạn giữa các người dùng khác nhau."

### Câu hỏi 2: "Tại sao trong mô hình phân quyền của bạn lại cho phép Workspace Admin đọc được Private Board của nhân viên?"
* **Trả lời:** "Đây là chính sách bảo mật doanh nghiệp (Company Governance Policy). Workspace là tài sản thuộc về tổ chức. Nếu nhân viên tạo một bảng Private rồi nghỉ việc hoặc lưu trữ thông tin trái quy định, Workspace Owner và Admin vẫn phải có khả năng kiểm tra và giám sát. Tuy nhiên, để đảm bảo tính riêng tư của nhóm thực hiện, hệ thống chỉ cấp quyền **Read-Only** cho Workspace Admin nếu họ không phải là thành viên chính thức của bảng đó, ngăn họ can thiệp vào tiến độ công việc đang chạy."

---

## 🏆 Tổng Kết Hoàn Thành Phase 2
Chúng ta đã bóc tách toàn diện trái tim nghiệp vụ của TeamHub:
1. [`03-kanban-core-engine.md`](./03-kanban-core-engine.md): Mô hình phân cấp dữ liệu, Thuật toán Fractional Indexing $O(1)$, Cross-list moves, Archive vs Delete.
2. [`04-kanban-permissions-and-caching.md`](./04-kanban-permissions-and-caching.md): Two-Tier RBAC, Enterprise Read-Only Policy, Kỹ thuật tách actor khỏi Cache, Ma trận Bump Version.
