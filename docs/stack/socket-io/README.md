# Lộ Trình Học WebSocket & Giao Thức Mạng Socket.IO Trong TeamHub

Thư mục này đào sâu về bản chất của **Giao thức mạng truyền tải thời gian thực (Realtime Networking)** và kiến trúc thư viện **Socket.IO** — công nghệ mang lại tính năng Board Chat và đồng bộ thông báo tức thì cho **TeamHub**.

---

## 🗺️ Bản Đồ Lộ Trình Chuyên Đề (Roadmap)

| STT | Tài liệu | Trọng tâm kiến thức |
| :---: | :--- | :--- |
| **01** | [`01-websocket-protocols.md`](./01-websocket-protocols.md) | **Sự Tiến Hóa Của Giao Thức Realtime:** So sánh HTTP Polling, Long-Polling, SSE và WebSocket Full-Duplex. Quá trình bắt tay HTTP Upgrade 101. |
| **02** | [`02-socketio-architecture.md`](./02-socketio-architecture.md) | **Kiến Trúc Socket.IO Chuyên Sâu:** Engine.IO transport fallback, Heartbeat Ping/Pong 25s, Cơ chế Rooms/Namespaces, và mở rộng đa Server bằng Redis Adapter Pub/Sub. |

---

## 🎯 So Sánh Vị Trí Của Các Giao Thức

```
HTTP Polling     : [Client] ──(Request)──► [Server] ──(Response)──► [Đóng Kết Nối]  (Lặp lại liên tục)
WebSocket (WS)   : [Client] ◄═══════ KÊNH GIAO TIẾP 2 CHIỀU SONG CÔNG ═══════► [Server]  (Mở 1 lần duy nhất)
```
