# 📁 TeamHub Media Assets

Thư mục này chứa các tài nguyên hình ảnh (Banner, Screenshots) và video demo phục vụ cho `README.md` và tài liệu dự án TeamHub.

---

## 📂 Cấu Trúc Thư Mục

```bash
docs/assets/
├── banner.png                     # Banner chính của dự án (16:9 Dark Mode)
├── teamhub-banner.png             # Bản sao banner chính
├── screenshots/                   # Chứa ảnh chụp màn hình các trang & tính năng (18 ảnh)
│   ├── landing-page.png           # Trang giới thiệu (Landing Page)
│   ├── auth.png                   # Trang xác thực & đăng nhập (Auth Dark Theme)
│   ├── workspaces.png             # Danh sách không gian làm việc
│   ├── in-workspace.png           # Chi tiết không gian & danh sách Board
│   ├── board-view.png             # Giao diện tổng quan Board & bộ lọc
│   ├── kanban-view.png            # Bảng Kanban kéo thả realtime Socket.IO
│   ├── timeline-view.png          # Chế độ xem Lịch trình (Timeline View)
│   ├── card.png                   # Chi tiết thẻ (Checklists, Attachments)
│   ├── ai-breakdown.png           # Tính năng ✨ AI Sub-task Breakdown
│   ├── label.png                  # Hệ thống quản lý nhãn dán đa sắc
│   ├── background.png             # Tùy biến hình nền & gradient Board
│   ├── chat.png                   # Hộp thoại Chat Realtime theo Board
│   ├── comment.png                # Bình luận & thảo luận trên thẻ
│   ├── audit-log.png              # Nhật ký kiểm toán & truy vết hoạt động
│   ├── member.png                 # Quản lý & phân quyền thành viên
│   ├── analytics.png              # Báo cáo thống kê hiệu suất & KPI
│   ├── profile.png                # Hồ sơ người dùng & cài đặt cá nhân
│   └── feedback.png               # Widget đóng góp ý kiến & phản hồi đồ án
└── videos/                        # Chứa video demo hoặc link video
    └── .gitkeep
```

---

## 💡 Gợi Ý Chụp Màn Hình Dành Cho Nhà Tuyển Dụng

Để các nhà tuyển dụng / reviewer có trải nghiệm tốt nhất khi xem `README.md`:
1. **Độ phân giải**: Nên chụp ở màn hình tỷ lệ 16:9 hoặc full-width trình duyệt (1920x1080 hoặc zoom 100% - 110%).
2. **Theme**: Bật Dark Mode hoặc Light Mode đồng nhất (khuyến nghị Dark Mode để khớp phong cách banner).
3. **Dữ liệu**: Sử dụng các tài khoản có sẵn dữ liệu mẫu (`owner@teamhub.local` hoặc `admin@teamhub.local`) để hiển thị nhiều thẻ, biểu đồ và hoạt động sinh động nhất.
4. **Thay thế**: Khi bạn chụp ảnh mới xong, chỉ cần lưu đè lên tên file tương ứng trong `docs/assets/screenshots/` hoặc gửi tên file cho AI để tự động cập nhật vào `README.md`.
