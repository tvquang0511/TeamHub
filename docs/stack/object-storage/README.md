# Lộ Trình Học Object Storage (MinIO & AWS S3) Trong TeamHub

Thư mục này phân tích toàn diện công nghệ **Lưu trữ đối tượng (Object Storage)** với chuẩn tương thích **AWS S3 / MinIO** — nền tảng quản lý toàn bộ tệp tin, hình ảnh và tài liệu nhị phân của **TeamHub**.

---

## 🗺️ Bản Đồ Lộ Trình Chuyên Đề (Roadmap)

| STT | Tài liệu | Trọng tâm kiến thức |
| :---: | :--- | :--- |
| **01** | [`01-object-storage-fundamentals.md`](./01-object-storage-fundamentals.md) | **Bản Chất Object Storage:** So sánh File Storage, Block Storage và Object Storage. Tại sao các hệ thống hàng triệu người dùng luôn lưu file trên S3/MinIO. |
| **02** | [`02-presigned-urls-and-sigv4.md`](./02-presigned-urls-and-sigv4.md) | **Chữ Ký Số SigV4 & Presigned URLs:** Giải mã từng bước thuật toán HMAC-SHA256 SigV4, luồng Direct Upload, và cấu hình CORS Bucket. |

---

## 🎯 So Sánh Vị Trí Của Các Loại Bộ Nhớ Lưu Trữ

```
┌─────────────────┬────────────────────────────────────────────────────────┐
│ Block Storage   │ Lưu trữ khối ổ cứng thô (vd: AWS EBS) gắn vào VM/OS    │
├─────────────────┼────────────────────────────────────────────────────────┤
│ File Storage    │ Cấu trúc cây thư mục phân cấp truyền thống (POSIX/NFS) │
├─────────────────┼────────────────────────────────────────────────────────┤
│ Object Storage  │ Không gian phẳng (Flat Namespace), truy cập qua HTTP REST,│
│ (S3 / MinIO)    │ lưu trữ không giới hạn dung lượng với độ bền 99.999999999%│
└─────────────────┴────────────────────────────────────────────────────────┘
```
