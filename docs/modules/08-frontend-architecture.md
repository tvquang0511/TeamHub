# 08 - Kiến Trúc Giao Diện Frontend (React 19 & TanStack Query)

---

## 1. Bản Đồ Tổng Quan Kiến Trúc Frontend

Giao diện người dùng của TeamHub được xây dựng trên nền tảng công nghệ hiện đại nhất:
* **Framework:** **React 19** kết hợp bộ công cụ đóng gói siêu tốc **Vite 7**.
* **Ngôn ngữ:** **TypeScript 5.9** với chế độ kiểm tra kiểu nghiêm ngặt.
* **Styling:** **Tailwind CSS v4** mới nhất.
* **Quản lý trạng thái Server:** **TanStack Query v5** (@tanstack/react-query).
* **Giao tiếp API:** **Axios** với cơ chế Interceptor tự động phục hồi phiên.
* **Thời gian thực:** **Socket.IO Client**.
* **Kéo thả Kanban:** **React DnD** (HTML5 Drag and Drop Backend).

---

## 2. Tổ Chức Thư Mục Theo Tính Năng (Feature-Driven Architecture)

Thay vì chia thư mục theo kiểu kỹ thuật truyền thống (`components/`, `views/`, `services/`), TeamHub tổ chức theo mô hình **Feature-Driven (Gom nhóm theo nghiệp vụ)** tại [`frontend/src/app/features/`](file:///d:/projects/persional-projects/Teamhub/frontend/src/app/features/):

```
frontend/src/app/
├── api/             # Cấu hình Axios Client & Interceptors
├── components/      # UI components dùng chung (Button, Dialog, Modal...)
├── hooks/           # Custom React hooks dùng chung
├── layouts/         # Khung giao diện (AppLayout, AuthLayout, BoardLayout)
├── providers/       # Context Providers (AuthProvider, QueryProvider, ThemeProvider)
└── features/        # CÁC MODULE NGHIỆP VỤ ĐỘC LẬP:
    ├── auth/        # Màn hình & Form Đăng nhập, Đăng ký, Quên mật khẩu
    ├── board/       # Bảng Kanban, Cột, Thanh công cụ, Chat Drawer
    ├── cards/       # Chi tiết thẻ Modal, Checklist, Bình luận, Đính kèm
    ├── workspace/   # Quản lý không gian làm việc, Danh sách thành viên, Lời mời
    └── users/       # Thông tin cá nhân, Đổi mật khẩu, Tải ảnh Avatar
```

👉 **Lợi ích:** Mỗi feature tự chứa toàn bộ components, hooks, và API calls của riêng nó. Khi cần sửa tính năng Board, lập trình viên chỉ cần tập trung vào thư mục `features/board` mà không phải mở hàng chục thư mục rời rạc.

---

## 3. Quản Lý Trạng Thái Máy Chủ (Server State Management Với TanStack Query)

### Tại sao không dùng Redux hay Zustand cho dữ liệu API?
Trong các ứng dụng hiện đại, 80% dữ liệu trong app là **Server State** (Dữ liệu thuộc về máy chủ, cần đồng bộ qua mạng). Việc đưa dữ liệu API vào Redux bắt lập trình viên phải viết hàng trăm dòng boilerplate code (Actions, Reducers, Loading flags, Error states).

**TanStack Query v5** giải quyết toàn bộ bài toán này:
* **Tự động Caching & Deduping:** Hai component cùng dùng chung dữ liệu Board chỉ phát sinh duy nhất 1 HTTP request.
* **Auto-Refetch on Window Focus:** Khi người dùng chuyển tab và quay lại, TanStack Query tự động kiểm tra và làm mới dữ liệu.
* **Garbage Collection:** Tự động giải phóng bộ nhớ khi người dùng rời khỏi màn hình.

### Quy chuẩn đặt Query Keys:
TeamHub chuẩn hóa Query Keys theo mảng phân cấp để dễ dàng làm mới dữ liệu (Invalidation):
* Board View: `['board', boardId]`
* Card Detail: `['card', cardId]`
* Workspace Members: `['workspace', workspaceId, 'members']`
* My Notifications: `['notifications']`

---

## 4. Kỹ Thuật Optimistic Updates (Cập Nhật UI Siêu Tốc 60 FPS)

Khi người dùng kéo thả một thẻ từ cột "To Do" sang "In Progress", nếu chờ API phản hồi (mất 100ms - 300ms) rồi mới di chuyển thẻ trên giao diện, người dùng sẽ có cảm giác ứng dụng bị đơ giật.

TeamHub áp dụng kỹ thuật **Optimistic Updates (Cập nhật giao diện trước, xác nhận API sau)**:

```
[ User Kéo Thẻ ]
       │
       ▼
1. TẠM DỪNG CÁC QUERY ĐANG CHẠY:
   await queryClient.cancelQueries({ queryKey: ['board', boardId] })
       │
       ▼
2. LƯU LẠI BẢN SNAPSHOT CỦA TRẠNG THÁI HIỆN TẠI (Để phòng ngừa lỗi):
   const previousData = queryClient.getQueryData(['board', boardId])
       │
       ▼
3. CẬP NHẬT TRỰC TIẾP LÊN QUERY CACHE (UI di chuyển thẻ tức thì trong 0ms):
   queryClient.setQueryData(['board', boardId], (old) => moveCardLocally(old, ...))
       │
       ▼
4. GỬI HTTP REQUEST NGẦM LÊN SERVER:
   axios.put(`/cards/${cardId}/move`, payload)
       │
       ├─► THÀNH CÔNG: Hoàn tất!
       │
       └─► THẤT BẠI:
              - Khôi phục lại trạng thái cũ: queryClient.setQueryData(..., previousData)
              - Bắn thông báo Toast: "Không thể di chuyển thẻ, vui lòng thử lại!"
```
👉 *Trải nghiệm người dùng:* Giao diện mượt mà tuyệt đối 60 khung hình/giây như một ứng dụng Native trên máy tính!

---

## 5. Tự Động Phục Hồi Phiên Đăng Nhập (Axios Interceptor Token Rotation)

Tại tầng Axios Client, TeamHub thiết lập một **Response Interceptor** thông minh để xử lý việc hết hạn Access Token một cách vô hình đối với người dùng:

```
[ Client Gửi API Request ]
           │
           ▼
[ Server Trả Về HTTP 401: AUTH_TOKEN_EXPIRED ]
           │
           ▼
[ AXIOS RESPONSE INTERCEPTOR BẮT ĐƯỢC LỖI ]:
1. Kiểm tra: Có đang trong quá trình Refresh Token không?
   - Nếu CÓ: Đẩy request này vào hàng đợi chờ (Queue).
   - Nếu CHƯA: Đặt cờ isRefreshing = true và gọi API:
     POST /auth/refresh { refreshToken: storedRefreshToken }
           │
           ├─► REFRESH THÀNH CÔNG:
           │      - Lưu Access Token mới vào bộ nhớ.
           │      - Lấy lại các request đang nằm trong hàng đợi chờ.
           │      - REPLAY TẤT CẢ CÁC REQUEST BAN ĐẦU với Token mới!
           │      - Người dùng tiếp tục làm việc mà không hề hay biết phiên vừa được làm mới!
           │
           └─► REFRESH THẤT BẠI (Refresh Token cũng hết hạn):
                  - Xóa sạch token khỏi storage.
                  - Điều hướng người dùng về màn hình /login.
```

---

## 🎯 Góc Nhìn Phỏng Vấn (Interview Cheatsheet)

### Câu hỏi: "Bạn áp dụng chiến lược gì để quản lý State trên Frontend và tối ưu trải nghiệm kéo thả Kanban?"
* **Trả lời:** "Trên Frontend, em phân tách rành mạch giữa **Client State** (như trạng thái đóng/mở sidebar, theme dark/light quản lý bằng React State) và **Server State** (quản lý hoàn toàn bằng **TanStack Query v5**). Đối với tính năng kéo thả Kanban, em áp dụng kỹ thuật **Optimistic Updates**. Khi người dùng kéo thả thẻ, client sẽ lưu lại một bản snapshot trạng thái trước đó, sau đó ghi đè trực tiếp vị trí mới vào cache của TanStack Query để giao diện phản hồi tức thì mà không cần chờ mạng. Song song đó, client gửi request HTTP ngầm lên backend. Nếu mạng gặp sự cố hoặc server từ chối, hệ thống sẽ tự động rollback lại vị trí cũ từ snapshot và bắn thông báo Toast, giúp giao diện đạt tốc độ 60 FPS mượt mà."
