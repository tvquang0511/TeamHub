# 02 - Kiến Trúc Socket.IO Chuyên Sâu (Heartbeat, Engine.IO, Rooms & Redis Scaling)

---

## 1. Socket.IO Không Phải Là WebSocket Thuần Túy!

Nhiều lập trình viên lầm tưởng Socket.IO chỉ là một thư viện bọc ngoài (wrapper) của WebSocket.  
Thực tế, **Socket.IO là một hệ thống ứng dụng thời gian thực hoàn chỉnh** được xây dựng trên kiến trúc phân tầng độc lập gồm hai lớp:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   SOCKET.IO LAYER (TẦNG ỨNG DỤNG)                      │
│   - Quản lý Namespaces (ví dụ: `/workspace`, `/board`)                 │
│   - Quản lý Rooms (ví dụ: `board:b_123`)                               │
│   - Event Multiplexing (Tách biệt các sự kiện: `card:moved`, `chat`)   │
│   - Acknowledgement Callbacks (Xác nhận Client đã nhận được tin)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Mã hóa gói tin Socket.IO)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    ENGINE.IO LAYER (TẦNG TRUYỀN DẪN)                   │
│   - Quản lý Session ID (`sid`) & Trạng thái kết nối vật lý             │
│   - Cơ chế bắt tay đa phương thức (Transport Upgrade: Polling ──► WS)   │
│   - Cơ chế Heartbeat (Ping / Pong phát hiện đứt mạng)                  │
│   - Đóng gói dữ liệu nhị phân / Packet Framing                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
   [ WebSocket Transport ]                   [ HTTP Long-Polling Transport ]
   (Kết nối TCP liên tục)                    (Fallback khi có Firewall chặn)
```

### Tại sao TeamHub chọn Socket.IO thay vì thư viện `ws` thuần?
1. **Khả năng tự động kết nối lại (Auto-Reconnection with Exponential Backoff):**  
   Khi người dùng đi qua vùng mất sóng 4G, Socket.IO tự động thử kết nối lại với độ trễ tăng dần (1s, 2s, 4s, 8s...). Khi mạng có lại, nó tự động tái gia nhập (Rejoin) vào các Room cũ mà không cần viết thêm code xử lý.
2. **Cơ chế Fallback thông minh (HTTP Long-Polling):**  
   Một số mạng Wi-Fi bảo mật cao tại doanh nghiệp, ngân hàng chặn toàn bộ cổng WebSocket. Socket.IO tự động hạ cấp xuống HTTP Long-Polling để ứng dụng vẫn hoạt động bình thường thay vì bị mất kết nối hoàn toàn.
3. **Trừu tượng hóa Khái niệm Room (Phòng):**  
   Thư viện `ws` thuần không hề có khái niệm Room. Để gửi tin nhắn cho 5 người cùng mở 1 Board, bạn phải tự quản lý vòng lặp duyệt `Set<WebSocket>` trong RAM. Với Socket.IO, bạn chỉ cần gọi một dòng lệnh: `io.to("board:123").emit("card:updated", data)`.

---

## 2. Giao Thức Mã Hóa Gói Tin Của Engine.IO (Packet Encoding)

Engine.IO mã hóa các gói tin bằng cách đặt một ký tự số đầu tiên đại diện cho loại gói tin:

```
┌────────────────────────────────────────────────────────────────────────┐
│                    CÁC MÃ GÓI TIN TRONG ENGINE.IO PROTOCOL             │
├──────┬───────────────┬─────────────────────────────────────────────────┤
│ Mã   │ Tên Gói Tin   │ Ý Nghĩa Kỹ Thuật                                │
├──────┼───────────────┼─────────────────────────────────────────────────┤
│ `0`  │ open          │ Server gửi về sau khi bắt tay (chứa sid, ping) │
│ `1`  │ close         │ Đóng kết nối                                    │
│ `2`  │ ping          │ Client hoặc Server gửi để kiểm tra liveness     │
│ `3`  │ pong          │ Phản hồi gói tin ping                           │
│ `4`  │ message       │ Gói tin chứa dữ liệu ứng dụng của Socket.IO     │
│ `5`  │ upgrade       │ Gói tin xác nhận nâng cấp lên WebSocket         │
│ `6`  │ noop          │ Gói tin giữ chỗ không làm gì (Long-polling fix) │
└──────┴───────────────┴─────────────────────────────────────────────────┘
```

Bên trong gói tin `4` (message), Socket.IO tiếp tục đặt mã phụ cho sự kiện:
* `40`: Socket.IO Connect
* `42`: Socket.IO Event (chứa tên sự kiện và payload JSON)
* `43`: Socket.IO Ack (Callback xác nhận)

**Ví dụ thực tế một gói tin khi kéo thả thẻ trong TeamHub:**
```
42["card:moved",{"id":"c_123","listId":"l_456","position":"1050.5"}]
▲▲
│└─ Mã 2: Socket.IO Event
└── Mã 4: Engine.IO Message
```

---

## 3. Quá Trình Nâng Cấp Tự Động (Transport Upgrade Flow)

Mặc định, Socket.IO khởi động kết nối bằng **HTTP Long-Polling trước**, sau đó mới nâng cấp song song lên **WebSocket**:

```
[ CLIENT ]                                                          [ SERVER ]
    │                                                                   │
    │───(1) HTTP GET /socket.io/?transport=polling ────────────────────►│
    │◄──(2) HTTP 200 OK: 0{"sid":"abc","upgrades":["websocket"]}────────┤
    │                                                                   │
    │───(3) HTTP GET /socket.io/?transport=websocket (PROBE WEBSOCKET)─►│
    │    Upgrade: websocket                                             │
    │◄──(4) HTTP 101 Switching Protocols                                ┤
    │                                                                   │
    │───(5) Gửi Frame WS kiểm tra: 2probe ─────────────────────────────►│
    │◄──(6) Server phản hồi Frame WS: 3probe ───────────────────────────┤
    │                                                                   │
    │───(7) Gửi Frame WS xác nhận: 5 (UPGRADE HOÀN TẤT)────────────────►│
    │                                                                   │
    ▼                                                                   ▼
    [ ĐÓNG KẾT NỐI POLLING - CHUYỂN HOÀN TOÀN SANG WEBSOCKET THUẦN TÚY ]
```

* **Lợi ích:** Đảm bảo kết nối được thiết lập thành công ngay lập tức (<50ms) trong mọi điều kiện mạng kể cả khi proxy có độ trễ lớn, sau đó âm thầm nâng cấp lên WebSocket tốc độ cao trong nền.

---

## 4. Bắt Buộc Sử Dụng Sticky Sessions Khi Mở Rộng Nhiều Server

Khi hệ thống TeamHub scale lên nhiều máy chủ Backend (`Node 1`, `Node 2`, `Node 3`) chạy sau một Load Balancer:

```
❌ THẢM HỌA KHI KHÔNG CÓ STICKY SESSIONS:

                    ┌──► [ Node 1 ] (Lưu Session ID "sid_999" trong RAM)
[ Client ] ──► [ LB ] 
                    └──► [ Node 2 ] (Không hề biết "sid_999" là ai!)
```

### Hiện tượng lỗi `400 Bad Request: Session ID unknown`:
1. Client gửi request Polling đầu tiên tới Load Balancer. LB định tuyến vào `Node 1`.  
   `Node 1` sinh Session ID `"sid_999"` và lưu thông tin socket này vào RAM của nó.
2. 2 giây sau, Client gửi HTTP POST mang theo dữ liệu và `"sid_999"`.
3. Nếu Load Balancer cấu hình thuật toán **Round-Robin** thông thường, request này bị đẩy vào `Node 2`!
4. `Node 2` kiểm tra RAM và thấy không có Session nào tên là `"sid_999"` $\rightarrow$ **Trả về lỗi `400 Bad Request: {"code": 1, "message": "Session ID unknown"}` ngay lập tức!**

### Giải pháp kỹ thuật:
1. **Bật Sticky Sessions (Session Affinity):**  
   Cấu hình Nginx / AWS ALB sử dụng Cookie gắn kết (Cookie-based sticky session). Mọi request mang cookie `io` từ một client sẽ luôn luôn được đẩy về đúng một máy chủ Node.js duy nhất.
2. **Ép buộc dùng WebSocket thuần túy (Pure WebSocket):**  
   Nếu không muốn dùng Sticky Sessions, phía Frontend Client có thể cấu hình bỏ qua bước Polling và kết nối trực tiếp vào WebSocket ngay từ đầu:
   ```typescript
   const socket = io("https://api.teamhub.vn", {
     transports: ["websocket"], // Bỏ qua HTTP Polling!
   });
   ```

---

## 5. Mở Rộng Cụm Nhiều Máy Chủ Với Redis Adapter

### Vấn nạn gửi tin nhắn xuyên máy chủ (Cross-Server Communication):
* Thành viên A kết nối vào `Node 1`.
* Thành viên B kết nối vào `Node 2`.
* Cả hai cùng mở một Board Kanban (`board:b_100`).
* Khi Thành viên A di chuyển thẻ: `Node 1` chạy lệnh `io.to("board:b_100").emit(...)`.
* **Vấn đề:** `Node 1` chỉ có thể gửi tin nhắn cho các socket kết nối trực tiếp vào RAM của nó. **Thành viên B ở `Node 2` hoàn toàn không nhận được cập nhật!**

---

### Giải pháp: `@socket.io/redis-adapter` (Redis Pub/Sub)

Trong file cấu hình Socket.IO của Backend:
```typescript
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));
```

```
✅ LUỒNG HOẠT ĐỘNG CỦA REDIS ADAPTER:

[ User A ] ──► [ Node 1 ]
                    │
                    ▼ (Gọi io.to("board:100").emit())
      ┌─────────────────────────────────┐
      │   REDIS PUB/SUB MESSAGE BROKER  │
      │   Channel: `socket.io#/#board:100#`
      └─────────────────┬───────────────┘
                        │ (Redis phát tán tin nhắn tới tất cả các Node)
         ┌──────────────┴──────────────┐
         ▼                             ▼
     [ Node 1 ]                    [ Node 2 ]
         │                             │
         ▼ (Emit cho socket local)     ▼ (Emit cho socket local)
     [ User C ]                    [ User B ] ✅ NHẬN ĐƯỢC TIN NHẮN!
```

* **Cách hoạt động bên dưới:**  
  Mỗi instance Socket.IO sẽ đăng ký theo dõi (Subscribe) các kênh Redis Pub/Sub tương ứng với các Room. Khi có lệnh `emit` vào một Room, Adapter sẽ tự động xuất bản (Publish) gói tin vào Redis. Redis phát tán gói tin tới tất cả các máy chủ Node.js trong cụm để gửi tiếp tới các Socket đang mở trên từng máy.

---

## 6. Cơ Chế Heartbeat & Quét "Kết Nối Ma" (Zombie Connections)

Khi người dùng đang dùng TeamHub trên điện thoại rồi đi vào thang máy mất sóng:
* Điện thoại không kịp gửi gói tin đóng kết nối (TCP FIN/RST) về cho máy chủ!
* Nếu không có cơ chế phát hiện, Server sẽ giữ socket đó mãi mãi trong RAM (gây rò rỉ bộ nhớ) và vẫn báo người dùng đang "Online".

### Cấu hình Ping/Pong trong Socket.IO:
* `pingInterval`: 25.000ms (Mỗi 25 giây Server gửi 1 gói Ping).
* `pingTimeout`: 20.000ms (Thời gian tối đa Server chờ Client gửi lại gói Pong).
* **Xử lý:** Nếu sau $25 + 20 = 45\text{ giây}$ mà Server không nhận được gói Pong nào từ Client, Server sẽ:
  1. Chủ động đóng kết nối TCP vật lý.
  2. Kích hoạt sự kiện `socket.on("disconnect", (reason) => ...)` với lý do `"ping timeout"`.
  3. Xóa socket ra khỏi RAM và các Room, cập nhật trạng thái người dùng về "Offline".

---

## 🎯 Góc Nhìn Phỏng Vấn (Interview Cheatsheet)

### Câu hỏi 1: "Kiến trúc bên dưới của Socket.IO gồm những tầng nào và vai trò của Engine.IO là gì?"
* **Trả lời:**  
  "Socket.IO được chia làm hai tầng độc lập:  
  1. **Tầng Socket.IO (Ứng dụng cấp cao):** Chịu trách nhiệm cung cấp các tính năng nghiệp vụ như Namespaces, Rooms, phân tách tên sự kiện (Event Multiplexing) và Acknowledgement Callbacks.  
  2. **Tầng Engine.IO (Truyền dẫn cấp thấp):** Chịu trách nhiệm quản lý kết nối vật lý thực tế giữa Client và Server. Nó quản lý Session ID (`sid`), điều phối quá trình nâng cấp giao thức (Transport Upgrade từ HTTP Long-Polling lên WebSocket), quản lý cơ chế Heartbeat (Ping/Pong phát hiện mất mạng) và mã hóa các frame nhị phân.  
  Nhờ có sự tách biệt này, nếu kết nối WebSocket bị lỗi, Engine.IO có thể tự động hạ cấp xuống HTTP Long-Polling mà không làm gián đoạn tầng logic ứng dụng của Socket.IO."

### Câu hỏi 2: "Tại sao khi triển khai Socket.IO trên nhiều máy chủ sau Load Balancer, chúng ta bắt buộc phải bật Sticky Sessions?"
* **Trả lời:**  
  "Khi khởi tạo kết nối, mặc định Socket.IO sử dụng cơ chế HTTP Long-Polling trước để bắt tay. Trong quá trình này, máy chủ tiếp nhận request đầu tiên (ví dụ Node 1) sẽ cấp một Session ID (`sid`) và lưu session đó vào bộ nhớ RAM cục bộ của nó.  
  Nếu Load Balancer không bật Sticky Sessions mà dùng thuật toán Round-Robin, request HTTP tiếp theo của Client (để gửi dữ liệu hoặc chờ nhận tin) có thể bị định tuyến sang một máy chủ khác (ví dụ Node 2). Do Node 2 không hề có thông tin về `sid` này trong RAM của nó, nó sẽ lập tức từ chối và trả về lỗi **`400 Bad Request: Session ID unknown`**, khiến kết nối bị đổ vỡ liên tục. Do đó, Sticky Sessions qua Cookie là bắt buộc để đảm bảo mọi request thuộc cùng một session luôn đi về đúng một máy chủ xử lý."

### Câu hỏi 3: "Cách thức hoạt động của `@socket.io/redis-adapter` khi scale hệ thống thời gian thực là gì?"
* **Trả lời:**  
  "`@socket.io/redis-adapter` giải quyết bài toán giao tiếp giữa các máy chủ (Cross-Server Broadcasting). Khi chúng ta scale ứng dụng lên nhiều Node, các Socket kết nối vào các máy chủ khác nhau sẽ không thể nhìn thấy nhau trong RAM.  
  Khi tích hợp Redis Adapter, mỗi Node sẽ mở 2 kết nối tới Redis (một Pub client và một Sub client). Khi bất kỳ máy chủ nào gọi lệnh `io.to(room).emit(event, data)`, Adapter sẽ đóng gói sự kiện và xuất bản (Publish) thông điệp vào kênh Redis Pub/Sub tương ứng. Toàn bộ các máy chủ khác trong cụm đang theo dõi kênh này sẽ nhận được thông điệp từ Redis và tiến hành phát tán (Broadcast) tiếp tới các Client đang kết nối trực tiếp vào RAM của chúng. Nhờ đó, người dùng ở các máy chủ khác nhau vẫn nhận được dữ liệu của nhau một cách đồng bộ."
