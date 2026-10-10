# 02 - Không Gian Làm Việc & Phân Quyền Đa Tầng (Workspaces & RBAC)

---

## 1. Bản Đồ Tổng Quan Module Workspaces

Trong các ứng dụng cộng tác như TeamHub, **Workspace (Không gian làm việc)** là ranh giới cô lập dữ liệu cấp cao nhất (**Top-level Tenant Boundary**). 

Tất cả các tài nguyên bên dưới — bao gồm Bảng Kanban (Boards), Danh sách (Lists), Thẻ (Cards), Hoạt động (Activities) — đều phải neo trực tiếp hoặc gián tiếp vào một `workspace_id`.

Module này giải quyết 4 bài toán kiến trúc cốt lõi:
1. **Cô lập dữ liệu đa người thuê (Multi-Tenancy Isolation):** Ngăn chặn người dùng từ Workspace A đọc trộm hoặc sửa đổi dữ liệu của Workspace B.
2. **Hệ thống phân quyền theo vai trò (Role-Based Access Control - RBAC):** 3 cấp bậc rõ ràng (`OWNER`, `ADMIN`, `MEMBER`).
3. **Bảo vệ toàn vẹn quyền sở hữu (Owner Integrity Protection):** Ngăn chặn việc loại bỏ Owner cuối cùng khiến Workspace trở thành "vô chủ".
4. **Vòng đời lời mời tham gia (Invite Lifecycle):** Mời qua email với token có thời hạn và xử lý tranh chấp khi chấp nhận/từ chối.

---

## 2. Mô Hình Dữ Liệu & Ràng Buộc Cơ Sở Dữ Liệu

File định nghĩa: [`backend/prisma/schema.prisma`](file:///d:/projects/persional-projects/Teamhub/backend/prisma/schema.prisma)

```
        ┌────────────────────────────────┐
        │          workspaces            │
        │────────────────────────────────│
        │ id (UUID, PK)                  │
        │ name (VARCHAR 200)             │
        │ description (TEXT, Nullable)   │
        │ background_image_url (TEXT)    │
        └───────┬────────────────┬───────┘
                │ 1:N            │ 1:N
                ▼                ▼
     ┌──────────────────────┐  ┌──────────────────────┐
     │  workspace_members   │  │  workspace_invites   │
     │──────────────────────│  │──────────────────────│
     │ id (PK)              │  │ id (PK)              │
     │ workspace_id (FK)    │  │ workspace_id (FK)    │
     │ user_id (FK)         │  │ email                │
     │ role (ENUM)          │  │ token (Unique)       │
     │                      │  │ role (ENUM, default) │
     │                      │  │ expires_at           │
     │                      │  │ accepted_at          │
     └──────────────────────┘  └──────────────────────┘
```

### Điểm nhấn thiết kế Schema:
* **Composite Unique Constraint trên `workspace_members`:**
  ```prisma
  @@unique([workspaceId, userId], map: "uq_workspace_members_workspace_user")
  ```
  Ngăn chặn tuyệt đối việc một người dùng bị gán 2 bản ghi thành viên trong cùng 1 Workspace ở tầng Database (tránh Race Condition).
* **Role Enum trong PostgreSQL:**
  ```prisma
  enum workspace_member_role {
    OWNER
    ADMIN
    MEMBER
  }
  ```

---

## 3. Ma Trận Phân Quyền (RBAC Permission Matrix)

Hệ thống thiết lập ma trận kiểm soát truy cập nghiêm ngặt giữa 3 vai trò:

| Thao tác nghiệp vụ | `MEMBER` | `ADMIN` | `OWNER` | Middleware bảo vệ |
| :--- | :---: | :---: | :---: | :--- |
| **Xem chi tiết Workspace & Danh sách thành viên** | ✅ | ✅ | ✅ | `requireWorkspaceMember()` |
| **Chỉnh sửa tên / mô tả Workspace** | ❌ | ✅ | ✅ | `requireWorkspaceAdmin()` |
| **Tải lên / Đổi hình nền Workspace (Background)** | ❌ | ✅ | ✅ | `requireWorkspaceAdmin()` |
| **Gửi lời mời thành viên mới (`invite`)** | ❌ | ✅ | ✅ | `requireWorkspaceAdmin()` |
| **Thăng / Hạ cấp vai trò thành viên khác** | ❌ | ✅ | ✅ | `requireWorkspaceAdmin()` |
| **Kick thành viên ra khỏi Workspace** | ❌ | ✅ | ✅ | `requireWorkspaceAdmin()` |
| **Xóa vĩnh viễn Workspace** | ❌ | ❌ | ✅ | `requireWorkspaceOwner()` |
| **Tự rời khỏi Workspace (`leave`)** | ✅ | ✅ | ⚠️ *(Có điều kiện)* | `requireWorkspaceMember()` |

---

## 4. Middleware Guards Kiểm Soát Phân Quyền

Toàn bộ logic bảo vệ được hiện thực hóa qua các Higher-Order Middleware tại [`backend/src/common/middlewares/requireWorkspaceRole.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/common/middlewares/requireWorkspaceRole.ts):

```typescript
export function requireWorkspaceRole(allowed: WorkspaceRole[], options: Options = {}): RequestHandler {
  const param = options.param ?? 'id';

  return async (req, _res, next) => {
    try {
      const userId = req.user?.id; // Lấy từ authJwt middleware phía trước
      if (!userId) return next(new ApiError(401, 'AUTH_REQUIRED', 'Authentication required'));

      const workspaceId = getWorkspaceId(req, param);
      
      // 1. Kiểm tra User có thuộc Workspace này không
      const membership = await workspacesRepo.findMembership(workspaceId, userId);
      if (!membership) {
        return next(new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a workspace member'));
      }

      // 2. Kiểm tra Role có nằm trong danh sách được phép không
      if (!allowed.includes(membership.role as WorkspaceRole)) {
        return next(new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Insufficient workspace role'));
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export const requireWorkspaceAdmin = () => requireWorkspaceRole(['OWNER', 'ADMIN']);
export const requireWorkspaceOwner = () => requireWorkspaceRole(['OWNER']);
```

### Áp dụng tại Router ([`workspaces.router.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/workspaces/workspaces.router.ts)):
Nhờ tính năng gom nhóm Middleware của Express, việc khai báo route cực kỳ tường minh:
```typescript
router.patch('/:id', requireWorkspaceAdmin(), updateWorkspace);
router.delete('/:id', requireWorkspaceOwner(), deleteWorkspace);
router.delete('/:id/members/:userId', requireWorkspaceAdmin(), removeWorkspaceMember);
```

---

## 5. Các Quy Tắc Nghiệp Vụ Sống Còn (Defensive Business Rules)

### 5.1 Quy tắc "Không bao giờ để Workspace vô chủ" (Owner Integrity)
Điều gì xảy ra nếu Owner duy nhất của Workspace tự bấm "Rời khỏi Workspace" (`leave`) hoặc bị giáng chức thành `MEMBER`? Workspace đó sẽ vĩnh viễn không ai có quyền quản trị hoặc xóa!

TeamHub chặn đứng kịch bản này tại [`workspaces.service.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/workspaces/workspaces.service.ts#L146-L157):
```typescript
async leave(userId: string, workspaceId: string) {
  const membership = await workspacesRepo.findMembership(workspaceId, userId);
  if (!membership) throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a workspace member');

  // NẾU NGƯỜI RỜI ĐI LÀ OWNER:
  if (membership.role === 'OWNER') {
    const ownerCount = await workspacesRepo.countOwners(workspaceId);
    if (ownerCount <= 1) {
      // Chặn ngay lập tức! Bắt buộc phải chuyển giao quyền Owner cho người khác trước
      throw new ApiError(400, 'WORKSPACE_OWNER_REQUIRED', 'Workspace must have at least one OWNER');
    }
  }

  await workspacesRepo.removeMember(workspaceId, userId);
  return { ok: true };
}
```

Tương tự, khi một Admin/Owner cố tình hạ cấp một Owner khác xuống Member, hàm `updateMemberRole` kiểm tra: nếu đó là Owner cuối cùng thì không cho phép hạ quyền.

---

### 5.2 Luồng Vòng Đời Lời Mời (Invite Lifecycle)

```
[ Admin / Owner ]                                          [ Người Được Mời (Email) ]
       │                                                              │
       │───(1. POST /workspaces/:id/invites)                          │
       │    body: { email: "a@gmail.com", role: "MEMBER" }            │
       │                                                              │
       ▼                                                              │
[ Sinh Token 32 bytes ]                                               │
  token = crypto.randomBytes(32).toString('hex')                      │
  Lưu DB với expires_at = NOW() + 7 ngày                              │
       │                                                              │
       ├─────────────────(2. Gửi Email Lời Mời)──────────────────────►│
       │                                                              │
       │                                                 User đăng nhập & bấm Chấp nhận
       │                                                              │
       │                                        (3. POST /invites/my/:inviteId/accept)
       │                                                              │
       │◄─────────────────────────────────────────────────────────────┤
       ▼
[ Kiểm tra 4 điều kiện nghiêm ngặt ]:
  1. Token có tồn tại trong DB không?
  2. Token đã được accepted_at trước đó chưa? (Chống Replay Attack)
  3. Thời hạn expires_at còn hiệu lực không?
  4. Người đang bấm chấp nhận ĐÃ LÀ THÀNH VIÊN của Workspace chưa?
       │
       ▼ (Hợp lệ)
[ Transaction ]:
  1. UPDATE workspace_invites SET accepted_at = NOW()
  2. INSERT INTO workspace_members (workspace_id, user_id, role)
```

---

### 5.3 Cơ Chế Đổi Hình Nền Workspace Không Để Lại File Rác
Khi Admin cập nhật ảnh nền Workspace:
1. Client gọi `/background/init`: Server trả về Presigned URL của MinIO/S3 với đường dẫn cố định:
   $$\text{objectKey} = \text{workspace-backgrounds/\{workspaceId\}}$$
2. Client upload file trực tiếp lên MinIO/S3.
3. Client gọi `/background/commit`: Server cập nhật URL mới vào DB (kèm chuỗi query version `?v=timestamp` để chống cache trình duyệt).
4. **Tự động dọn rác:** Nếu trước đó Workspace từng dùng link hình nền cũ theo định dạng timestamp thời kỳ đầu, Backend sẽ lập tức đẩy một Job vào BullMQ `blobs` queue để xóa object cũ trên S3 ngầm dưới nền.

---

## 🎯 Góc Nhìn Phỏng Vấn (Interview Cheatsheet)

### Câu hỏi 1: "Làm thế nào bạn đảm bảo dữ liệu giữa các Workspace không bị rò rỉ lẫn nhau (Tenant Isolation)?"
* **Trả lời:** "Hệ thống áp dụng cơ chế xác thực và phân quyền 2 lớp (Defense in Depth). Lớp thứ nhất là Middleware `authJwt` giải mã danh tính người dùng. Lớp thứ hai là Middleware `requireWorkspaceMember` kiểm tra quyền sở hữu đối với `workspace_id` trong URL trước khi request chạm vào Controller. Ở tầng Database, tất cả các bảng tài nguyên (Board, List, Card) đều có khóa ngoại tham chiếu chặt chẽ tới Workspace, kết hợp với các index kép `[workspaceId, userId]` để truy vấn nhanh và loại trừ hoàn toàn nguy cơ truy cập chéo dữ liệu."

### Câu hỏi 2: "Bạn xử lý trường hợp một người dùng rời khỏi Workspace như thế nào để hệ thống không bị lỗi dữ liệu?"
* **Trả lời:** "Đối với thành viên thông thường hoặc Admin, việc rời nhóm chỉ đơn giản là xóa bản ghi trong bảng `workspace_members`. Nhưng đối với vai trò `OWNER`, em áp dụng quy tắc phòng thủ: đếm tổng số lượng Owner hiện có trong Workspace bằng câu lệnh `countOwners`. Nếu số lượng Owner $\le 1$, hệ thống sẽ từ chối thao tác và trả về lỗi `WORKSPACE_OWNER_REQUIRED`. Điều này buộc người dùng phải thăng cấp một thành viên khác lên làm Owner trước khi rời đi, tránh tình trạng Workspace bị mồ côi."

---

## 🏆 Tổng Kết Hoàn Thành Phase 1
Chúng ta đã hoàn thành xuất sắc 2 trụ cột nền tảng của TeamHub:
1. [`01-auth-and-security.md`](./01-auth-and-security.md): Xác thực JWT kép, SHA-256 Hashing, RTR, Rate Limiting.
2. [`02-workspaces-and-memberships.md`](./02-workspaces-and-memberships.md): Cô lập Workspace, RBAC 3 cấp, Luồng Invite và toàn vẹn Owner.
