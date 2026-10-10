# 01 - Sự Tiến Hóa Của Giao Thức Thời Gian Thực (From Polling To WebSocket RFC 6455)

---

## 1. Sự Tiến Hóa Của Các Giải Pháp Realtime Trên Nền Web

Trước khi giao thức WebSocket được tiêu chuẩn hóa vào năm 2011 bởi IETF (RFC 6455), lập trình viên web phải sử dụng nhiều kỹ thuật "chắp vá" trên nền HTTP để truyền dữ liệu thời gian thực tới trình duyệt:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        SO SÁNH 4 CÔNG NGHỆ TRUYỀN DẪN THỜI GIAN THỰC                   │
├─────────────────┬──────────────────┬──────────────────┬────────────────┬───────────────┤
│ Tiêu chí        │ Short Polling    │ Long Polling     │ SSE (HTTP)     │ WebSocket     │
├─────────────────┼──────────────────┼──────────────────┼────────────────┼───────────────┤
│ Hướng truyền    │ Nửa song công    │ Nửa song công    │ Đơn công       │ Song công toàn│
│                 │ (Half-duplex)    │ (Half-duplex)    │ (Server-to-Cli)│ phần (Full)   │
│ Độ trễ (Latency)│ Rất cao (1-5s)   │ Trung bình       │ Rất thấp (<10ms│ Cực thấp (<5ms│
│ Chi phí Header  │ ~1KB mỗi request │ ~1KB mỗi request │ Thấp (Sau ban  │ Siêu nhẹ:     │
│                 │ (Lặp lại cookies)│ (Lặp lại headers)│ đầu)           │ 2 đến 10 bytes│
│ Số kết nối TCP  │ Mở/đóng liên tục │ Mở/đóng liên tục │ 1 TCP duy nhất │ 1 TCP duy nhất│
│ Hỗ trợ Binary   │ Có (Base64/Form) │ Có (Base64/Form) │ Chỉ Text UTF-8 │ Hỗ trợ Binary │
│ Giới hạn HTTP/1 │ Không giới hạn   │ Không giới hạn   │ Tối đa 6 conn  │ Không bị giới │
│                 │                  │                  │ trên mỗi domain│ hạn bởi trình │
└─────────────────┴──────────────────┴──────────────────┴────────────────┴───────────────┘
```

### 1.1 Short Polling (Hỏi Thăm Định Kỳ)
Client sử dụng `setInterval` gửi `GET /api/notifications` mỗi 2 giây:
* ❌ **Khuyết điểm:** 95% số request trả về mảng rỗng `[]` vì không có dữ liệu mới. Máy chủ phải liên tục xử lý bắt tay TLS, phân tích HTTP Header, xác thực JWT và mở kết nối DB $\rightarrow$ Tiêu tốn CPU và băng thông vô ích.

### 1.2 Long Polling (Hỏi Thăm Treo Kết Nối)
Client gửi HTTP request, Server **treo kết nối lại** (không trả về phản hồi ngay) cho tới khi có sự kiện mới phát sinh thì mới trả về dữ liệu và đóng kết nối. Client nhận xong lập tức mở ngay request kế tiếp:
* ❌ **Khuyết điểm:** Mặc dù giảm được số request rỗng, mỗi thông điệp gửi đi vẫn phải chịu chi phí đóng gói lại toàn bộ HTTP Headers (Cookies, User-Agent, Bearer Token) tốn khoảng 800 - 1.500 bytes mỗi lần.

### 1.3 Server-Sent Events (SSE)
Một kết nối HTTP đơn luồng duy nhất được duy trì mở (`Content-Type: text/event-stream`), Server liên tục đẩy các khối dữ liệu dạng chuỗi xuống Client:
* ❌ **Khuyết điểm:** Là giao thức **một chiều (Unidirectional)**. Client không thể gửi dữ liệu ngược lại cho Server trên cùng kết nối đó (phải tạo thêm HTTP POST riêng). Ngoài ra, trên chuẩn HTTP/1.1, trình duyệt giới hạn tối đa chỉ mở được 6 kết nối SSE đồng thời cho mỗi domain.

### 1.4 WebSocket: Cuộc Cách Mạng Song Công Toàn Phần (Full-Duplex)
Giao thức WebSocket giải quyết triệt để mọi nhược điểm trên:
* Thiết lập **một kết nối TCP bền vững hai chiều (Bi-directional)** giữa Client và Server.
* Cả hai phía có thể độc lập gửi và nhận dữ liệu bất cứ thời điểm nào mà không cần chờ đợi nhau.
* **Overhead siêu nhẹ:** Khung dữ liệu nhị phân (Frame) của WebSocket chỉ tốn từ **2 đến 10 bytes overhead** (thay vì 1.000 bytes như HTTP), cho phép ứng dụng Kanban như TeamHub truyền tải hàng nghìn sự kiện kéo thả thẻ và tin nhắn chat mỗi giây với độ trễ gần như bằng không.

---

## 2. Quá Trình Bắt Tay Nâng Cấp Giao Thức (HTTP Upgrade 101 Handshake)

Để vượt qua các hệ thống Tường lửa (Firewalls) và Proxy doanh nghiệp vốn chỉ cho phép các cổng web chuẩn (cổng 80 cho HTTP và 443 cho HTTPS), WebSocket không mở cổng riêng mà bắt đầu bằng một yêu cầu HTTP tiêu chuẩn để xin **nâng cấp giao thức (Protocol Upgrade)**:

```
[ BROWSER CLIENT ]                                              [ NODE.JS SERVER ]
        │                                                               │
        │───(1) HTTP GET Request (Yêu cầu nâng cấp giao thức)──────────►│
        │    GET /socket.io/?transport=websocket HTTP/1.1               │
        │    Host: api.teamhub.vn                                       │
        │    Upgrade: websocket                                         │
        │    Connection: Upgrade                                        │
        │    Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==                │
        │    Sec-WebSocket-Version: 13                                  │
        │                                                               │
        │◄──(2) HTTP 101 Switching Protocols (Server chấp thuận)────────┤
        │    HTTP/1.1 101 Switching Protocols                           │
        │    Upgrade: websocket                                         │
        │    Connection: Upgrade                                        │
        │    Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=         │
        │                                                               │
        ▼                                                               ▼
        [ KẾT THÚC GIAO THỨC HTTP - KẾT NỐI TCP CHUYỂN SANG WEBSOCKET ]
        │◄═════════════════════════════════════════════════════════════►│
        │             Truyền nhận các Binary Frame 2 chiều              │
```

### Chứng minh toán học mã băm `Sec-WebSocket-Accept`:
Tại sao Server không chỉ trả về mã 200 mà phải tính toán chuỗi `Sec-WebSocket-Accept` phức tạp?  
Mục đích là để **chứng minh với Client rằng Server thực sự hiểu đặc tả RFC 6455 của WebSocket**, chứ không phải là một Proxy trung gian vô tình trả lời bộ đệm cũ.

Thuật toán tính toán của Server:
1. Lấy giá trị chuỗi ngẫu nhiên do Client gửi lên: `Sec-WebSocket-Key` (ví dụ: `"dGhlIHNhbXBsZSBub25jZQ=="`).
2. Nối chuỗi đó với một chuỗi GUID ma thuật cố định được quy định trong chuẩn RFC 6455:  
   $$\text{Magic GUID} = \text{"258EAFA5-E914-47DA-95CA-C5AB0DC85B11"}$$
3. Tính mã băm **SHA-1** của chuỗi kết quả:  
   $$\text{Hash} = \text{SHA1}(\text{"dGhlIHNhbXBsZSBub25jZQ==258EAFA5-E914-47DA-95CA-C5AB0DC85B11"})$$
4. Mã hóa kết quả băm thành chuỗi **Base64** và gán vào header `Sec-WebSocket-Accept`:  
   $$\text{Sec-WebSocket-Accept} = \text{"s3pPLMBiTxaQ9kYGzzhZRbK+xOo="}$$

---

## 3. Cấu Trúc Khung Nhị Phân WebSocket (RFC 6455 Frame Specification)

Sau khi hoàn tất bước bắt tay 101, toàn bộ dữ liệu trao đổi không còn ở dạng văn bản HTTP nữa mà được đóng gói thành các **Khung nhị phân (Binary Frames)**:

```
  0                   1                   2                   3
  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 +-+-+-+-+-------+-+-------------+-------------------------------+
 |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
 |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
 |N|V|V|V|       |S|             |   (if payload len==126/127)   |
 | |1|2|3|       |K|             |                               |
 +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
 |     Extended payload length continued, if payload len == 127  |
 + - - - - - - - - - - - - - - - +-------------------------------+
 |                               |Masking-key, if MASK set to 1  |
 +-------------------------------+-------------------------------+
 | Masking-key (continued)       |          Payload Data         |
 +-------------------------------- - - - - - - - - - - - - - - - +
 :                     Payload Data continued ...                :
 +---------------------------------------------------------------+
```

### Giải mã các trường bit trong Header:
1. **`FIN` (1 bit):** Báo hiệu đây có phải là mảnh dữ liệu cuối cùng của thông điệp hay không (`1` = Thông điệp hoàn chỉnh hoặc mảnh cuối; `0` = Còn các mảnh tiếp theo).
2. **`Opcode` (4 bits):** Định danh loại dữ liệu của Frame:
   * `0x1`: Text frame (Chuỗi UTF-8, ví dụ JSON event của Socket.IO).
   * `0x2`: Binary frame (Dữ liệu nhị phân thô, tệp ảnh, âm thanh).
   * `0x8`: Connection Close (Thông báo ngắt kết nối an toàn).
   * `0x9`: Ping frame (Gói tin kiểm tra liveness).
   * `0xA`: Pong frame (Gói tin phản hồi Ping).
3. **`MASK` (1 bit):** Cờ quy định dữ liệu có được mã hóa bằng Masking Key hay không.
4. **`Payload length` (7 bits, 7+16 bits, hoặc 7+64 bits):**
   * Nếu giá trị $0 - 125$: Kích thước dữ liệu chính là số này (Header chỉ tốn 2 bytes!).
   * Nếu giá trị bằng $126$: Kích thước được mở rộng thêm 2 bytes tiếp theo (chứa dữ liệu lên tới 65.535 bytes).
   * Nếu giá trị bằng $127$: Kích thước được mở rộng thêm 8 bytes tiếp theo (chứa dữ liệu lên tới $2^{64}-1$ bytes).
5. **`Masking-key` (4 bytes = 32 bits):** Khóa ngẫu nhiên dùng để giải mã dữ liệu.

---

## 4. Vì Sao Client Bắt Buộc Phải Masking Dữ Liệu? (Vụ Tấn Công Cache Poisoning)

> **Quy định nghiêm ngặt của RFC 6455:**  
> * Mọi frame gửi từ **Client lên Server BẮT BUỘC phải Masking (`MASK = 1`)**. Nếu Server nhận được frame từ Client mà `MASK = 0`, Server **phải ngắt kết nối ngay lập tức**!  
> * Ngược lại, mọi frame gửi từ **Server xuống Client TUYỆT ĐỐI KHÔNG ĐƯỢC Masking (`MASK = 0`)**.

### Nguồn gốc lỗ hổng bảo mật lịch sử (Proxy Cache Poisoning):
Năm 2010, các chuyên gia bảo mật phát hiện một lỗ hổng nghiêm trọng trên các máy chủ Proxy trung gian (Transparent Proxies):
1. Một kẻ xấu viết mã JavaScript độc hại chạy trên trình duyệt nạn nhân.
2. Đoạn mã này mở kết nối WebSocket tới server của kẻ tấn công, và cố tình gửi dữ liệu thô giả mạo một câu trả lời HTTP:  
   `HTTP/1.1 200 OK\r\nContent-Type: script/javascript\r\n...`
3. Một Proxy trung gian cũ kỹ nằm giữa người dùng và Internet không hiểu giao thức WebSocket, nó tưởng nhầm đây là một phản hồi HTTP thực sự và lưu khối dữ liệu độc hại này vào bộ nhớ đệm Cache của nó.
4. Khi những người dùng khác trong mạng công ty truy cập vào website đó, Proxy trả về script độc hại đã bị đầu độc $\rightarrow$ Toàn bộ mạng nội bộ bị chiếm quyền kiểm soát (**Cache Poisoning Attack**).

### Giải pháp Masking bằng phép toán XOR:
Để ngăn chặn trình duyệt gửi lên một chuỗi byte cố định có thể đoán trước:
* Trình duyệt Client bắt buộc phải sinh ra một chuỗi ngẫu nhiên 4 bytes (`Masking Key` $M$) cho mỗi frame.
* Dữ liệu gửi đi $P$ được mã hóa qua phép toán XOR:
  $$P'_i = P_i \oplus M_{i \pmod 4}$$
* Phía Server nhận được chỉ cần làm phép toán XOR ngược lại để lấy dữ liệu gốc:
  $$P_i = P'_i \oplus M_{i \pmod 4}$$
* Nhờ phép XOR với khóa ngẫu nhiên, chuỗi byte thực tế truyền trên đường dây mạng hoàn toàn ngẫu nhiên và không bao giờ trùng với các mẫu HTTP chuẩn, triệt tiêu 100% nguy cơ đầu độc Cache của Proxy!

---

## 5. TCP Keep-Alive vs WebSocket Application Ping/Pong

Nhiều lập trình viên đặt câu hỏi: *"Hệ điều hành đã có cơ chế TCP Keep-Alive, tại sao giao thức WebSocket vẫn cần định nghĩa thêm frame Ping/Pong (`Opcode 0x9 / 0xA`)?"*

```
┌────────────────────────────────────────────────────────────────────────┐
│                   SO SÁNH TCP KEEP-ALIVE VÀ WS PING/PONG               │
├─────────────────┬──────────────────────────┬───────────────────────────┤
│ Tiêu chí        │ TCP Keep-Alive (Tầng 4)  │ WebSocket Ping/Pong (Tầng 7│
├─────────────────┼──────────────────────────┼───────────────────────────┤
│ Nơi kiểm tra    │ Nhân hệ điều hành (Kernel│ Mã ứng dụng (Node.js App) │
│ Phát hiện treo  │ ❌ KHÔNG (Kernel vẫn trả │ ✅ CÓ (Nếu Event Loop của │
│ luồng (App Hang)│ lời ACK dù Node.js bị    │ ứng dụng bị block, Ping   │
│                 │ treo cứng Event Loop)    │ sẽ không thể phản hồi)    │
│ Tần suất kiểm tra│ Mặc định 2 tiếng một lần │ Tùy chỉnh (mỗi 25 giây)   │
│ Vượt NAT Timeout│ Kém (Nhiều Router ngắt   │ Hoàn hảo (Giữ trạng thái  │
│                 │ bảng NAT sau 60s idle)   │ kết nối NAT bảng luôn mở) │
└─────────────────┴──────────────────────────┴───────────────────────────┘
```

👉 **Kết luận:** Ping/Pong ở tầng ứng dụng của WebSocket là cơ chế duy nhất đảm bảo chắc chắn rằng cả tiến trình Node.js và trình duyệt đều đang hoạt động khỏe mạnh và sẵn sàng xử lý dữ liệu.

---

## 🎯 Góc Nhìn Phỏng Vấn (Interview Cheatsheet)

### Câu hỏi 1: "Quá trình nâng cấp bắt tay (Handshake Upgrade) từ HTTP lên WebSocket diễn ra như thế nào?"
* **Trả lời:**  
  "Quá trình bắt tay WebSocket bắt đầu bằng một yêu cầu HTTP GET thông thường từ Client với hai tiêu đề đặc biệt: `Upgrade: websocket` và `Connection: Upgrade`, kèm theo một chuỗi ngẫu nhiên 16 bytes được Base64 hóa là `Sec-WebSocket-Key`.  
  Khi Server chấp thuận, nó sẽ nối chuỗi `Sec-WebSocket-Key` này với một chuỗi GUID ma thuật chuẩn hóa (`258EAFA5-E914-47DA-95CA-C5AB0DC85B11`), tính giá trị băm SHA-1 rồi mã hóa Base64 kết quả để tạo thành header `Sec-WebSocket-Accept`. Server sau đó trả về mã trạng thái **HTTP 101 Switching Protocols**. Kể từ thời điểm này, kết nối HTTP chấm dứt, và kết nối TCP bên dưới được giữ nguyên để chuyển sang truyền nhận các frame nhị phân hai chiều của WebSocket."

### Câu hỏi 2: "Tại sao Client bắt buộc phải Masking dữ liệu khung WebSocket nhưng Server thì không được phép Masking?"
* **Trả lời:**  
  "Đây là cơ chế bảo mật cốt lõi trong RFC 6455 nhằm ngăn chặn cuộc tấn công **Proxy Cache Poisoning (Đầu độc bộ đệm Proxy)**. Nếu dữ liệu từ trình duyệt gửi lên không được mã hóa, kẻ tấn công có thể dùng JavaScript để gửi một payload trông giống hệt như một phản hồi HTTP hợp lệ. Các máy chủ Proxy trung gian cũ kỹ khi chặn bắt gói tin có thể hiểu nhầm đó là một phản hồi HTTP thực tế và lưu vào bộ nhớ đệm, dẫn đến lây nhiễm mã độc cho các người dùng khác trong mạng.  
  Bằng cách bắt buộc Client phải thực hiện phép toán XOR dữ liệu với một `Masking Key` 4 bytes ngẫu nhiên trước khi gửi lên, chuỗi byte truyền trên đường dây mạng sẽ hoàn toàn ngẫu nhiên và không thể đoán trước. Phía Server không cần masking khi gửi xuống vì trình duyệt Client là điểm cuối của dữ liệu chứ không đóng vai trò làm Proxy phân phối cho ai khác."

### Câu hỏi 3: "So sánh WebSocket và Server-Sent Events (SSE). Trong trường hợp nào thì nên dùng SSE thay vì WebSocket?"
* **Trả lời:**  
  "WebSocket là giao thức song công toàn phần hai chiều (Full-Duplex), hoạt động trên một kết nối TCP riêng biệt với chi phí framing cực nhỏ (2-10 bytes), lý tưởng cho các ứng dụng tương tác hai chiều cao như chat, game online, hoặc bảng Kanban kéo thả realtime.  
  Trong khi đó, SSE (Server-Sent Events) là giao thức một chiều (Unidirectional) chỉ từ Server đẩy xuống Client, chạy trên nền tảng HTTP tiêu chuẩn và chỉ hỗ trợ định dạng văn bản UTF-8. Chúng ta nên ưu tiên dùng **SSE** cho các trường hợp:  
  1. Ứng dụng chỉ có nhu cầu đọc một chiều (ví dụ: bảng tỷ giá chứng khoán, thông báo thông thường, hoặc hiển thị streaming chữ trả lời của mô hình AI ChatGPT).  
  2. Cần tận dụng tối đa hạ tầng HTTP có sẵn (như nén gzip, HTTP/2 multiplexing, và cơ chế tự động kết nối lại native của trình duyệt mà không cần cài thêm thư viện)."
