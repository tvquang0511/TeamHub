# TeamHub Assets — Thư Mục Tài Nguyên Hình Ảnh

Thư mục này là **nơi lưu trữ tập trung duy nhất** cho toàn bộ tài nguyên hình ảnh (Banner, UI Screenshots, System Diagrams) phục vụ cho `README.md` và tài liệu kỹ thuật của dự án TeamHub.

---

## 📁 Cấu Trúc Thư Mục

```
docs/assets/
├── teamhub-banner.png             # Banner chính hiển thị ở đầu README.md
├── screenshots/                   # 18 ảnh chụp màn hình giao diện Web App
│   ├── landing-page.png
│   ├── auth.png
│   ├── workspaces.png
│   ├── in-workspace.png
│   ├── kanban-view.png
│   ├── board-view.png
│   ├── timeline-view.png
│   ├── analytics.png
│   ├── card.png
│   ├── ai-breakdown.png
│   ├── comment.png
│   ├── chat.png
│   ├── label.png
│   ├── background.png
│   ├── audit-log.png
│   ├── member.png
│   ├── profile.png
│   └── feedback.png
│
└── diagrams/                      # 11 ảnh sơ đồ kiến trúc & luồng Sequence
    ├── system-architecture.png
    ├── component-diagram.png
    ├── sequence-auth-login-refresh-logout.png
    ├── sequence-card-create-move.png
    ├── sequence-invites.png
    ├── sequence-attachment-upload.png
    ├── sequence-avatar-upload.png
    ├── sequence-workspace-background-upload.png
    ├── sequence-reminder-email.png
    ├── sequence-blob-delete.png
    └── sequence-analytics-daily-rollup.png
```

---

## 📌 Hướng Dẫn Sử Dụng Trong Tài Liệu Markdown

Khi nhúng ảnh vào tài liệu, sử dụng đường dẫn tương đối hoặc tuyệt đối từ gốc repo:

```markdown
<!-- Nhúng Banner -->
![TeamHub Banner](docs/assets/teamhub-banner.png)

<!-- Nhúng UI Screenshot -->
![Kanban Board](docs/assets/screenshots/kanban-view.png)

<!-- Nhúng Sơ đồ Kiến trúc -->
![System Architecture](docs/assets/diagrams/system-architecture.png)
```
