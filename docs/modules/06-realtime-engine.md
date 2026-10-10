# 06 - Giao Tiếp Thời Gian Thực (Realtime Engine & Socket.IO)

---

## 1. Bản Đồ Tổng Quan Kiến Trúc Realtime

Trong một nền tảng làm việc nhóm như TeamHub, trải nghiệm thời gian thực (Realtime Collaboration) là bắt buộc. Khi một thành viên gửi tin nhắn trong Board Chat hoặc giao việc cho một thành viên khác, thông tin phải hiển thị tức thì trên màn hình của họ mà **không cần người dùng phải F5 tải lại trang**.

TeamHub sử dụng thư viện **Socket.IO** chạy song song trên cùng HTTP Server với Express API:

```
                                  [ CLIENT BROWSER ]
                                          │
                        ┌─────────────────┴─────────────────┐
                        │ (HTTP REST)                       │ (WebSocket / Polling)
                        ▼                                   ▼
             [ Express API Router ]               [ Socket.IO Server ]
             - Authentication                     - Handshake Auth Guard
             - CRUD Boards/Cards/Lists            - Rooms Management
             - Database Transactions              - Event Broadcasting
                        │                                   │
                        └─────────────────┬─────────────────┘
                                          │
                                          ▼
                                   [ PostgreSQL ]
```

---

## 2. Quy Trình Xác Thực WebSocket (Handshake Authentication)

Khác với HTTP gửi header xác thực trong từng request, WebSocket chỉ thực hiện bắt tay (**Handshake**) đúng một lần khi thiết lập kết nối ban đầu.

File: [`backend/src/realtime/socket.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/realtime/socket.ts#L55-L78)

```
[ Client ]                                                       [ Socket.IO Server ]
    │                                                                     │
    │───(1. Yêu cầu kết nối Handshake)───────────────────────────────────►│
    │    auth: { token: "<ACCESS_TOKEN>" }                                │
    │    hoặc header: Authorization: Bearer <ACCESS_TOKEN>                │
    │                                                                     │
    ▼                                                                     ▼
                                                         [ Middleware io.use() ]:
                                                         1. Trích xuất Token
                                                         2. Giải mã bằng JWT_ACCESS_SECRET
                                                                  │
                                            ┌─────────────────────┴─────────────────────┐
                                            ▼ (Hợp lệ)                                  ▼ (Lỗi / Hết hạn)
                                  [ socket.data.user = payload ]              [ Từ chối bắt tay ]
                                  [ next() cho phép kết nối ]                 [ Trả về AUTH_TOKEN_EXPIRED ]
```

### Điểm nhấn bảo mật:
* **Tương thích đa nguồn:** Client có thể truyền token qua object `socket.handshake.auth.token` (khuyến nghị cho Web) hoặc qua header chuẩn HTTP `Authorization: Bearer`.
* **Namespace Isolation cho Admin UI:** Đường dẫn `/admin` (dành cho công cụ giám sát Socket.IO Admin UI) được bypass tầng xác thực JWT của ứng dụng và sử dụng cơ chế bảo vệ riêng bằng **Basic Auth với mật khẩu mã hóa bcrypt**.

---

## 3. Kiến Trúc Phân Chia Phòng (Rooms Topology)

Để tránh tình trạng "bắn tin nhắn tràn lan" (Broadcast toàn bộ server) gây lãng phí băng thông và vi phạm bảo mật dữ liệu, TeamHub thiết lập 2 loại **Phòng (Rooms)** chuyên biệt:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SOCKET.IO INSTANCE                              │
├────────────────────────────────────┬───────────────────────────────────┤
│    1. USER PERSONAL ROOM           │    2. BOARD COLLABORATION ROOM    │
│       `user:${userId}`             │       `board:${boardId}`          │
│                                    │                                   │
│  - Tự động join khi login          │  - Phải gọi `board:join`          │
│  - Nhận thông báo cá nhân          │  - Chỉ thành viên Board mới được  │
│  - Giao việc (Assignee notification)│  - Chat tin nhắn thời gian thực  │
│  - Nhắc hẹn quá hạn (Reminders)    │  - Đồng bộ thẻ khi có thay đổi   │
└────────────────────────────────────┴───────────────────────────────────┘
```

### 3.1 Phòng Cá Nhân (`user:${userId}`)
Ngay khi người dùng kết nối thành công, server tự động gom kết nối của họ vào phòng riêng:
```typescript
io.on("connection", (socket) => {
  const userId = socket.data.user!.id;
  socket.join(`user:${userId}`); // Lắng nghe thông báo riêng
});
```

### 3.2 Phòng Bảng Làm Việc (`board:${boardId}`)
Khi người dùng mở một màn hình Board, Client gửi sự kiện `board:join`. Server bắt buộc phải kiểm tra quyền thành viên trước khi cho phép vào phòng:
```typescript
socket.on("board:join", async (payload: { boardId: string }, ack) => {
  const boardId = String(payload?.boardId ?? "");
  
  // BẢO VỆ CHẶT CHẼ: Gọi chatService để kiểm tra quyền thành viên Board
  // Nếu là người ngoài, hàm sẽ ném lỗi 403 Forbidden!
  await chatService.listBoardMessages(userId, boardId, { limit: 1 });

  await socket.join(`board:${boardId}`);
  ack?.({ ok: true });
});
```

---

## 4. Từ Điển Sự Kiện Thời Gian Thực (Event Catalog)

Hệ thống định nghĩa từ điển sự kiện rõ ràng giữa Client và Server:

| Tên Sự Kiện (Event) | Hướng truyền | Mục đích | Dữ liệu kèm theo (Payload) |
| :--- | :---: | :--- | :--- |
| `board:join` | Client $\rightarrow$ Server | Yêu cầu tham gia phòng chat của Board | `{ boardId: string }` |
| `chat:message:send` | Client $\rightarrow$ Server | Gửi tin nhắn mới vào phòng | `{ boardId, content, attachmentIds? }` |
| `chat:message:edit` | Client $\rightarrow$ Server | Chỉnh sửa nội dung tin nhắn cũ | `{ boardId, messageId, content }` |
| `chat:message:delete` | Client $\rightarrow$ Server | Xóa một tin nhắn | `{ boardId, messageId }` |
| `chat:message:new` | Server $\rightarrow$ Room | Bắn tin nhắn mới tới mọi người trong Board | Object tin nhắn hoàn chỉnh kèm User |
| `chat:message:updated`| Server $\rightarrow$ Room | Báo tin nhắn đã được chỉnh sửa | Object tin nhắn sau khi cập nhật |
| `chat:message:deleted`| Server $\rightarrow$ Room | Báo tin nhắn đã bị xóa | `{ boardId, messageId }` |
| `notification:new` | Server $\rightarrow$ User | Bắn chuông thông báo cá nhân | Object thông báo chi tiết |

---

## 5. Tích Hợp Realtime Push Từ Tầng Service (Singleton Pattern)

Một vấn đề phổ biến trong kiến trúc Backend là: **Làm thế nào để một Service nghiệp vụ thông thường (ví dụ: gán người vào thẻ tại `assignees.service.ts`) có thể bắn thông báo Socket.IO mà không làm phụ thuộc vòng (Circular Dependency)?**

### Giải Pháp: Export hàm Singleton `getSocketServer`
File: [`backend/src/realtime/socket.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/realtime/socket.ts#L40-L44)
```typescript
let ioInstance: Server | null = null;

export function getSocketServer(): Server | null {
  return ioInstance;
}
```

Tại [`notifications.service.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/notifications/notifications.service.ts#L27-L42):
```typescript
async createAndPushNotification(input: CreateNotificationInput) {
  // 1. Lưu bản ghi thông báo vào PostgreSQL trước (Source of Truth)
  const notification = await notificationsRepo.create(input);

  // 2. Bắn Realtime tức thì qua Socket.IO tới đúng User đó
  try {
    const io = getSocketServer();
    if (io) {
      io.to(`user:${input.userId}`).emit("notification:new", notification);
    }
  } catch (err) {
    // Best-effort: Nếu Socket lỗi, không làm rollback transaction tạo thông báo trong DB
    console.error("[Notification] Realtime push failed:", err);
  }

  return notification;
}
```
👉 *Kết quả:* Khi User A gán User B vào thẻ, ngay lập tức biểu tượng Chuông thông báo trên góc màn hình của User B phát sáng và hiển thị popup thông báo mà không cần User B phải tải lại trang!

---

## 6. Chuẩn Hóa Xử Lý Lỗi (Error Normalization)

Trong Socket.IO, các hàm callback phản hồi (Acknowledgement / `ack`) thường trả về object tự do, dễ gây lệch chuẩn với HTTP REST API.

TeamHub chuẩn hóa mọi lỗi Socket.IO qua hàm `normalizeSocketError`:
```typescript
function normalizeSocketError(err: any) {
  if (err && typeof err === "object") {
    if (typeof err.status === "number" && typeof err.code === "string") {
      return { code: err.code, message: err.message };
    }
  }
  const message = typeof err?.message === "string" ? err.message : "Unknown error";
  return { code: "SOCKET_ERROR", message };
}
```
👉 *Đồng nhất:* Frontend xử lý lỗi từ Socket.IO (`{ ok: false, error: { code, message } }`) hoàn toàn tương đồng với lỗi nhận từ Axios/Fetch REST API (`{ error: { code, message } }`).

---

## 7. Giám Sát Kết Nối Thời Gian Thực Với Socket.IO Admin UI

Trong môi trường Development, hệ thống tích hợp sẵn công cụ **Socket.IO Admin UI** tại đường dẫn `https://admin.socket.io`:

```typescript
if (env.SOCKET_ADMIN_UI_ENABLED && env.NODE_ENV !== "production") {
  instrument(io, {
    auth: {
      type: "basic",
      username: env.SOCKET_ADMIN_UI_USERNAME,
      password: passwordHash, // Xác thực bằng bcrypt
    },
    mode: "development",
  });
}
```
* Giúp lập trình viên theo dõi trực quan: Hiện có bao nhiêu client đang kết nối, mỗi socket đang nằm trong Room nào, và lưu lượng event bắn qua lại trong từng giây.

---

## 🎯 Góc Nhìn Phỏng Vấn (Interview Cheatsheet)

### Câu hỏi 1: "Làm thế nào bạn xác thực người dùng khi kết nối WebSocket trong hệ thống của mình?"
* **Trả lời:** "WebSocket chỉ thực hiện bắt tay HTTP một lần duy nhất lúc khởi tạo kết nối. Em sử dụng Middleware của Socket.IO (`io.use`) để can thiệp vào quá trình Handshake này. Client sẽ gửi JWT Access Token qua thuộc tính `auth.token`. Server giải mã token bằng chữ ký bí mật `JWT_ACCESS_SECRET`. Nếu hợp lệ, thông tin `userId` được gắn trực tiếp vào `socket.data.user` và cho phép kết nối. Nếu token hết hạn hoặc không hợp lệ, server sẽ ngắt kết nối ngay từ cổng và trả về mã lỗi chuẩn `AUTH_TOKEN_EXPIRED`."

### Câu hỏi 2: "Khi hệ thống mở rộng lên nhiều server (Horizontal Scaling), WebSocket sẽ gặp vấn đề gì và bạn giải quyết ra sao?"
* **Trả lời:** "Khi chạy nhiều Server Node.js phía sau Nginx Load Balancer, User A kết nối tới Server 1 còn User B kết nối tới Server 2. Nếu User A gửi tin nhắn, Server 1 chỉ bắn được tới các socket kết nối cục bộ trên RAM của nó mà không thể gửi tới User B trên Server 2. Để giải quyết, giải pháp chuẩn là gắn thêm thư viện **`@socket.io/redis-adapter`**. Khi đó, mỗi khi có event phát ra trong Room, server sẽ publish tin nhắn vào kênh **Redis Pub/Sub**. Tất cả các server khác cùng lắng nghe kênh đó và chuyển tiếp tin nhắn tới đúng socket của client trên máy của mình, đảm bảo tính phân tán hoàn hảo."

---

## 🏆 Hoàn Thành Module 06
Tài liệu đã bóc tách toàn diện:
1. Cơ chế Handshake Auth qua JWT.
2. Cấu trúc Room: `user:${id}` (Thông báo) & `board:${id}` (Cộng tác).
3. Từ điển sự kiện Event Catalog và cơ chế Acknowledgement (`ack`).
4. Mô hình Singleton `getSocketServer` tích hợp trực tiếp từ tầng Service.
5. Giải pháp mở rộng phân tán qua Redis Pub/Sub Adapter.
