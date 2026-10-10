# Realtime — Socket.IO (TeamHub)

Mục tiêu phần này: bạn có thể **giải thích được kiến trúc realtime của TeamHub**, và **trả lời được câu hỏi “tại sao làm như vậy”** (auth, rooms, consistency, scaling).

---

## 1) Socket.IO trong TeamHub dùng để làm gì?
TeamHub dùng Socket.IO cho 2 nhóm use-case:
1) **Board chat realtime** (send/edit/delete message)
2) **Sync realtime cho board** (emit events để các client khác cập nhật state nhanh)

Vì sao không dùng polling?
- Polling tốn request/DB, delay cao, khó realtime “mượt”.
- Socket.IO hỗ trợ reconnect, ack, rooms… giúp triển khai nhanh.

---

## 2) Concepts quan trọng (phải thuộc)
### 2.1 Namespace vs Room
- **Namespace**: phân vùng logic ở cấp URL (ví dụ `/`, `/admin`). TeamHub dùng default namespace `/` cho app.
- **Room**: nhóm sockets để broadcast. TeamHub dùng room theo board:
  - `board:{boardId}`

> Hệ quả: mọi event liên quan board đều emit đúng room, tránh broadcast global.

### 2.2 Handshake auth
Trong Socket.IO, auth thường làm ở handshake:
- Client gửi token trong `auth: { token }`.
- Server middleware verify JWT và gắn `socket.data.user`.

### 2.3 Ack callback
Event có thể trả kết quả theo mô hình request/response:
```ts
socket.emit('board:join', { boardId }, (ack) => {
  if (!ack.ok) toast.error(ack.error.message)
})
```

Ưu điểm:
- UX rõ ràng (join fail -> toast ngay)
- Protocol ổn định hơn “emit rồi đoán”

---

## 3) Backend realtime: flow chuẩn và các điểm bắt buộc

### 3.1 Auth middleware (JWT)
Backend xác thực token ở handshake:
- Lấy token từ `socket.handshake.auth.token` (client khuyến nghị) hoặc header Authorization.
- Verify bằng access JWT.
- Attach identity: `socket.data.user = { id, email }`.

Điểm phỏng vấn hay hỏi:
- “Tại sao dùng access token cho socket?”
  - Vì socket cũng là một “kênh truy cập tài nguyên”, phải có auth.
- “Token expire thì sao?”
  - Khi reconnect/emit sẽ gặp error; client cần refresh/re-login.

### 3.2 Join room phải có authorization (không được bỏ)
Room là boundary “ai nghe được event”. Nếu chỉ verify JWT mà **không check membership**, user có thể đoán `boardId` và join để nghe lén.

Luồng join:
1) Client emit `board:join { boardId }`.
2) Server kiểm tra quyền:
   - Dùng service layer để enforce “board member”.
   - Ở TeamHub hiện tại, join được implement theo hướng: gọi service (vd `chatService.listBoardMessages(..., { limit: 1 })`) để vừa:
     - reuse logic authZ (không duplicate rule)
     - đảm bảo user thật sự có quyền đọc chat.
3) Nếu ok -> `socket.join('board:{boardId}')` và ack `{ ok: true }`.

Nếu fail:
- ack `{ ok: false, error: { code, message } }`
- không join room

### 3.3 Emit events: scope đúng room
Nguyên tắc:
- Board chat -> emit tới `board:{boardId}`
- Board mutations -> emit tới `board:{boardId}`

Tại sao không emit cho toàn server?
- Data leak (user không thuộc board vẫn nghe)
- Traffic tăng theo N (mọi user đều nhận)

### 3.4 Event contract tối thiểu (nên nhớ)
Theo tài liệu contract bạn đã viết ở `docs/architecture/realtime-events.md`:

Client -> Server:
- `board:join`
- `chat:message:send`
- `chat:message:edit`
- `chat:message:delete`

Server -> Client:
- `chat:message:new`
- `chat:message:updated`
- `chat:message:deleted`
- (tuỳ module) `board:card_created`, `board:card_moved`, ...

---

## 4) Frontend realtime: cách TeamHub quản lý lifecycle

### 4.1 Kết nối socket theo vòng đời trang Board
Trong board page/panel:
- Tạo socket khi vào board:
  - `transports: ['websocket']` (ưu tiên websocket)
  - `auth: { token: accessToken }`
- Khi `connect` -> emit `board:join` và đợi ack.
- Subscribe events và merge state.
- Khi đổi board/unmount -> cleanup `disconnect()`.

Lưu ý quan trọng:
- Không tạo socket ở quá nhiều component con (dễ tạo nhiều connection).
- Nếu access token thay đổi (refresh) thì phải đảm bảo socket reconnect với token mới.

### 4.2 Consistency: phối hợp REST + Socket
TeamHub có 2 nguồn update:
- REST mutation (optimistic UI có thể có)
- Socket events broadcast

Rule để tránh double-apply:
- Nếu bạn optimistic update khi mutation -> khi socket event về, cần:
  - reconcile theo id (upsert), hoặc
  - ignore event nếu `actorId` là chính mình (nếu payload có actor), hoặc
  - invalidate query và refetch (đơn giản nhưng tốn request)

Trong phỏng vấn, bạn có thể nói:
- “Em ưu tiên optimistic cho UX, nhưng vẫn cần event để sync các client khác. Em đảm bảo idempotency ở FE bằng upsert theo `id`.”

---

## 5) Rate limit & abuse (chat/realtime)
Tối thiểu cần nghĩ đến:
- spam chat: limit theo user/board
- spam join/leave: limit theo socket

TeamHub hiện đã có Redis rate limit cho REST. Với Socket.IO, chiến lược tương tự:
- Counter theo `(userId, boardId)` trong window 10–60s.

---

## 6) Nginx reverse proxy cho WebSocket (đúng “prod-like”)
Trong `infra/nginx/conf.d/teamhub.conf`:
- `/socket.io/` proxy tới backend
- Bắt buộc:
  - `proxy_http_version 1.1`
  - `Upgrade` + `Connection: upgrade`
  - tăng `proxy_read_timeout` (để socket không bị cắt sớm)

---

## 6.1) Code pointers (đọc theo flow)
- Backend Socket.IO gateway: `backend/src/realtime/socket.ts`
- Backend JWT middleware (REST): `backend/src/common/middlewares/authJwt.ts`
- Chat service (enforce membership + CRUD): `backend/src/modules/chat/*` (tuỳ repo layout)
- Frontend chat panel lifecycle + socket events: `frontend/src/app/features/board/components/BoardChatPanel.tsx`
- Nginx websocket proxy: `infra/nginx/conf.d/teamhub.conf`

---

## 7) Checklist debug realtime (cực hay dùng khi phỏng vấn)
1) Join fail?
   - Kiểm tra ack error code
   - Token có hợp lệ/expired?
   - Membership check đúng chưa?
2) Có connect nhưng không nhận event?
   - Có join đúng room chưa?
   - Server emit đúng room string chưa?
3) WebSocket bị downgrade/polling?
   - Nginx có cấu hình upgrade?
   - Có bị proxy chặn header?
4) Message gửi được nhưng UI không update?
   - FE đang merge state đúng chưa (upsert theo id)?

---

## 8) Câu hỏi phỏng vấn + câu trả lời mẫu (30–60s)

### Q1: “Vì sao join room phải check membership?”
Trả lời:
> Vì room quyết định ai nghe được realtime events. Nếu chỉ verify JWT mà không check board membership ở `board:join` thì user có thể đoán boardId và join để nghe lén chat/activities. TeamHub enforce membership ở service layer trước khi `socket.join`.

### Q2: “Socket.IO vs WebSocket thuần?”
Trả lời:
> Socket.IO tiện hơn vì có rooms, ack, middleware auth, reconnect/backoff sẵn. Với đồ án như TeamHub nó giúp triển khai nhanh và ổn định. Nếu scale lớn thì vẫn cần nghĩ thêm về sticky session/adapter, nhưng hiện scope phù hợp.

### Q3: “Làm sao đảm bảo consistency giữa REST và realtime?”
Trả lời:
> REST là nguồn write chính; sau khi write DB thì backend emit socket event để các client khác sync. Ở FE em merge theo id (upsert) để event idempotent; nếu payload có actorId thì có thể ignore event từ chính mình hoặc chỉ reconcile nhẹ.
