# 04 - Kiểm Soát Lưu Lượng & Chống Tấn Công (Rate Limiting)

---

## 1. Rate Limiting Là Gì? Vì Sao Phải Dùng Redis?

**Rate Limiting** (Giới hạn tốc độ truy cập) là kỹ thuật kiểm soát số lượng yêu cầu (Requests) mà một Client (người dùng hoặc địa chỉ IP) được phép gửi tới API trong một khoảng thời gian nhất định (ví dụ: tối đa 60 requests/phút).

### 1.1 Mục tiêu bảo vệ trong TeamHub:
1. **Chống Brute-force & Credential Stuffing:** Ngăn chặn kẻ xấu dùng bot tự động đoán mật khẩu tại endpoint `/auth/login` hoặc spam yêu cầu gửi mail tại `/auth/forgot-password`.
2. **Ngăn chặn phá hoại / Spam dữ liệu:** Chống việc tạo hàng loạt bảng (Board), thẻ (Card), bình luận (Comment) tự động gây rác cơ sở dữ liệu.
3. **Bảo vệ tài nguyên tính toán (DoS Protection):** Các endpoint nặng như xem toàn bộ bảng (`board_view`) hay tính biểu đồ thống kê (`analytics`) tốn rất nhiều CPU/RAM; cần giới hạn chặt chẽ hơn các thao tác nhẹ.

### 1.2 Tại sao không dùng biến RAM cục bộ của Node.js?
Nhiều lập trình viên mới bắt đầu thường dùng một Object JavaScript hoặc `Map` trong bộ nhớ của Node.js để đếm số lượt gọi (`const counters = {}`). **Đây là một sai lầm chết người trong môi trường Production vì:**
* **Không hỗ trợ kiến trúc Multi-instance:** Khi hệ thống mở rộng chạy nhiều tiến trình (Node.js Cluster, PM2, hoặc nhiều Docker Containers nằm sau Nginx Load Balancer), RAM của mỗi tiến trình là hoàn toàn độc lập. Người dùng có thể spam gấp $N$ lần bằng cách gửi request luân phiên tới các container khác nhau.
* **Mất dữ liệu khi Server khởi động lại:** Mỗi lần deploy hoặc restart ứng dụng, bộ đếm bị reset về 0, tạo kẽ hở cho kẻ tấn công.
* **Bộ nhớ phình to (Memory Leak):** Lưu trữ hàng triệu IP trong RAM của tiến trình API dễ làm sập Node.js.

👉 **Redis đóng vai trò là "Single Source of Truth" tập trung**: Mọi instance của API đều trỏ chung về một cụm Redis để kiểm tra bộ đếm với độ trễ cực nhỏ (< 1ms).

---

## 2. Thuật Toán Fixed Window Counter Trong TeamHub

TeamHub sử dụng thuật toán **Fixed Window Counter** (Bộ đếm cửa sổ cố định). Đây là thuật toán tối ưu nhất về mặt hiệu năng và tài nguyên lưu trữ.

### 2.1 Bản chất toán học của thuật toán
Thời gian được chia thành các "khung cửa sổ" liên tiếp có kích thước cố định bằng `windowSec` (ví dụ: 60 giây):
* Cửa sổ 1: từ `10:00:00` đến `10:00:59`
* Cửa sổ 2: từ `10:01:00` đến `10:01:59`

Mốc bắt đầu của cửa sổ hiện tại được tính bằng công thức số học:
$$\text{nowSec} = \lfloor \text{Date.now()} / 1000 \rfloor$$
$$\text{windowStartSec} = \text{nowSec} - (\text{nowSec} \pmod{\text{windowSec}})$$

### 2.2 Cơ chế khóa nguyên tử bằng `INCR` và `EXPIRE`
Key được định dạng theo cấu trúc:
$$\text{rl:v1:\{name\}:\{identity\}:\{windowStartSec\}}$$

Ví dụ: `rl:v1:cards:u:usr_123:1712674800`

```
[ Request Đến ]
       │
       ▼
1. Tính toán key của cửa sổ hiện tại
2. Gửi lệnh tới Redis: INCR key (Tăng bộ đếm lên 1 một cách nguyên tử)
       │
       ├─► Nếu count == 1 (Lần đầu trong cửa sổ):
       │      Gửi tiếp lệnh: EXPIRE key (windowSec + 1)
       │      (Đảm bảo key tự tiêu hủy khi hết cửa sổ, không để lại rác)
       │
       ├─► Nếu count <= max:
       │      Thêm các Header: X-RateLimit-Remaining, X-RateLimit-Reset
       │      Cho phép request đi tiếp: next()
       │
       └─► Nếu count > max:
              Từ chối request ngay lập tức!
              Trả về HTTP 429 Too Many Requests kèm Header Retry-After
```

Toàn bộ logic trên được triển khai tại [`backend/src/common/middlewares/rateLimit.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/common/middlewares/rateLimit.ts#L34-L79):
```typescript
const redis = getCacheRedis();
const count = await redis.incr(key);
if (count === 1) {
  // Đặt thời gian sống cho key dôi ra 1 giây để bảo đảm qua khung cửa sổ mới
  await redis.expire(key, options.windowSec + 1);
}

const remaining = Math.max(0, options.max - count);
const resetSec = windowStartSec + options.windowSec;
res.setHeader("X-RateLimit-Limit", String(options.max));
res.setHeader("X-RateLimit-Remaining", String(remaining));
res.setHeader("X-RateLimit-Reset", String(resetSec));

if (count > options.max) {
  const retryAfter = options.windowSec - (nowSec - windowStartSec);
  res.setHeader("Retry-After", String(retryAfter));
  return res.status(429).json({
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests",
      details: { retryAfterSec: retryAfter },
    },
  });
}
```

---

## 3. Thiết Kế Dynamic Scope: Phân Biệt `ip` vs `user-or-ip`

Một trong những điểm yếu lớn nhất của nhiều hệ thống rate limit là: **Chỉ giới hạn theo IP (`req.ip`)**.

### Vấn đề: "Phạt Oan" khi dùng chung mạng văn phòng (NAT IP)
* Nếu 100 nhân viên trong một công ty cùng truy cập TeamHub qua mạng Wi-Fi văn phòng, họ sẽ có **chung 1 địa chỉ IP Public**.
* Nếu bạn đặt giới hạn 100 requests/phút theo IP: Chỉ cần 2 người thao tác nhanh là toàn bộ 98 người còn lại trong công ty bị chặn `429`, ứng dụng bị tê liệt!

### Giải pháp thông minh của TeamHub:
TeamHub phân tách làm 2 cơ chế định danh (`scope`):

```typescript
function getIdentity(req: Request, scope: RateLimitOptions["scope"]) {
  if (scope === "user" || scope === "user-or-ip") {
    const userId = req.user?.id;
    if (userId) return `u:${userId}`; // Ưu tiên định danh theo Tài khoản User!
    if (scope === "user") return "u:anon";
  }

  return `ip:${req.ip}`; // Fallback theo IP nếu chưa đăng nhập
}
```

1. **Các Route công khai (Chưa login):** Sử dụng scope `ip`
   * Route `/auth/login`: Giới hạn tối đa **20 lần / phút theo IP** (chặn tấn công dò mật khẩu).
   * Route `/auth/forgot-password`: Giới hạn tối đa **5 lần / giờ theo IP** (chặn spam email).
2. **Các Route nghiệp vụ (Đã login qua JWT):** Sử dụng scope `user-or-ip`
   * Middleware Rate Limit được gắn **SAU** middleware xác thực `authJwt`.
   * Khi đó, quota được cấp **riêng cho từng User ID** (`u:usr_abc`). 
   * Dù 100 nhân viên ngồi chung mạng văn phòng, mỗi người vẫn sở hữu hạn ngạch riêng của mình mà không ai làm ảnh hưởng đến ai!

---

## 4. Các Chuẩn Header HTTP Phản Hồi (RFC Standards)

Hệ thống tuân thủ đầy đủ các tiêu chuẩn quốc tế về API Rate Limiting:

| Header | Ý nghĩa | Ví dụ giá trị |
| :--- | :--- | :--- |
| `X-RateLimit-Limit` | Số request tối đa được phép trong 1 cửa sổ | `60` |
| `X-RateLimit-Remaining` | Số lượt request còn lại mà client có thể gọi tiếp | `42` |
| `X-RateLimit-Reset` | Mốc thời gian Unix (giây) mà bộ đếm sẽ được làm mới | `1712674860` |
| `Retry-After` | Số giây client phải chờ trước khi được thử lại (chỉ xuất hiện khi dính 429) | `18` |

Mã lỗi JSON trả về khi vượt ngưỡng:
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "details": {
      "retryAfterSec": 18
    }
  }
}
```

---

## 5. Bảng Hạn Mức Thực Tế Trong TeamHub

Dự án cấu hình sẵn các hạn ngạch chi tiết cho từng loại nghiệp vụ trong [`env.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/config/env.ts):

| Tính năng | Cửa sổ (giây) | Hạn mức tối đa | Lý do thiết kế |
| :--- | :---: | :---: | :--- |
| **Global API** | 60s | 240 reqs/IP | Lớp lưới an toàn bọc ngoài toàn bộ server |
| **Auth Login** | 60s | 20 reqs/IP | Siết chặt để chống dò quét mật khẩu |
| **Password Reset** | 3600s (1h) | 5 reqs/IP | Tránh lạm dụng server gửi mail SMTP |
| **Board View** | 60s | 30 reqs/user | Endpoint nặng, tải toàn bộ Kanban |
| **Cards CRUD** | 60s | 180 reqs/user | Cho phép kéo thả và chỉnh sửa thẻ thường xuyên |
| **Chat Board** | 60s | 90 reqs/user | Chat trao đổi tin nhắn thời gian thực |
| **Attachments** | 60s | 30 reqs/user | Giới hạn việc tạo presigned URL tải file lên S3 |
| **Analytics** | 60s | 30 reqs/user | Truy vấn biểu đồ tính toán nặng |

---

## 6. So Sánh Các Thuật Toán Rate Limiting & Hướng Nâng Cấp

| Thuật toán | Cơ chế | Ưu điểm | Nhược điểm | Trạng thái ở TeamHub |
| :--- | :--- | :--- | :--- | :--- |
| **Fixed Window Counter** | Đếm số lượng trong từng khung cố định (0-60s) | Cực nhanh, tốn rất ít RAM, code đơn giản | Có hiện tượng "Burst" lưu lượng gấp đôi ở ranh giới 2 cửa sổ | **Đang áp dụng chính thức** |
| **Sliding Window Log** | Lưu timestamp của từng request vào ZSet | Độ chính xác tuyệt đối 100% | Tốn nhiều RAM của Redis vì lưu từng request | Chưa cần thiết ở quy mô này |
| **Token Bucket** | Cấp phát token theo chu kỳ, mỗi request tiêu thụ 1 token | Xử lý mượt mà hiện tượng burst lưu lượng | Cần viết script Lua phức tạp trên Redis | Đề xuất nâng cấp phase 2 |

---

## 🎯 Tổng Kết Bài Học 04 & Góc Nhìn Phỏng Vấn

### Câu hỏi phỏng vấn thường gặp:
1. **"Bạn xử lý bài toán Rate Limiting như thế nào khi hệ thống scale lên nhiều server?"**
   * *Trả lời:* "Em sử dụng Redis làm cơ sở dữ liệu đếm tập trung. Thay vì lưu bộ đếm trong RAM của từng tiến trình Node.js (vốn sẽ không đồng bộ được giữa các server), tất cả các instance API đều gọi lệnh nguyên tử `INCR` và `EXPIRE` trên Redis để quản lý cửa sổ thời gian chung."

2. **"Nếu người dùng ở cùng mạng văn phòng truy cập hệ thống của bạn thì có bị chặn nhầm không?"**
   * *Trả lời:* "Dạ không, vì em đã thiết kế cơ chế **Dynamic Scope**. Đối với các API công khai chưa đăng nhập như Login/Register, hệ thống sẽ limit theo IP. Nhưng đối với tất cả các API sau khi đã đăng nhập (Workspaces, Boards, Cards), middleware rate limit được đặt sau tầng giải mã JWT và giới hạn theo **User ID** (`u:userId`), đảm bảo mỗi nhân viên có một hạn ngạch riêng biệt và công bằng."

3. **"Nếu Redis gặp sự cố thì chức năng Rate Limiting có làm sập toàn bộ API không?"**
   * *Trả lời:* "Hệ thống áp dụng triết lý **Fail-Open**. Khối code gọi Redis trong middleware Rate Limit được bọc trong khối `try/catch`. Nếu Redis bị timeout hoặc ngắt kết nối, lỗi sẽ được log lại và hàm `next()` vẫn được gọi để cho phép người dùng tiếp tục thao tác, ưu tiên tính sẵn sàng (High Availability) của dịch vụ."
