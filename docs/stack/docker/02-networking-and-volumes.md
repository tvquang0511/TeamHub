# 02 - Mạng Nội Bộ & Bền Vững Dữ Liệu (Docker Networking & Volumes)

---

## 1. Bản Chất Mạng Nội Bộ Docker (Docker Networking Architecture)

Khi bạn khởi chạy các container bằng Docker Compose, Docker tạo ra một môi trường mạng ảo khép kín. Hiểu rõ cách các container giao tiếp với nhau là kiến thức bắt buộc để không bao giờ gặp lỗi kết nối cơ sở dữ liệu.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MÁY CHỦ VẬT LÝ (HOST OS)                        │
│                                                                        │
│   Card mạng Host: eth0 (IP: 192.168.1.50)                              │
│   iptables NAT: Chuyển tiếp cổng 5432 trên Host ──► Cổng 5432 Container│
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                 DOCKER BRIDGE NETWORK: `infra_default`         │   │
│   │                 Card mạng ảo: docker0 (Gateway: 172.20.0.1)     │   │
│   ├────────────────────────────────────────────────────────────────┤   │
│   │                                                                │   │
│   │   [ Container: backend ]              [ Container: postgres ]  │   │
│   │   IP: 172.20.0.4                      IP: 172.20.0.2           │   │
│   │   Card ảo: veth_backend               Card ảo: veth_postgres   │   │
│   │         │                                   ▲                  │   │
│   │         │ (Gọi: postgres:5432)              │                  │   │
│   │         ▼                                   │                  │   │
│   │   [ DOCKER EMBEDDED DNS SERVER: 127.0.0.11 ]┘                  │   │
│   │                                                                │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 1.1 Docker Bridge Network Hoạt Động Ra Sao?
* Docker tạo ra một cầu nối ảo (**Virtual Bridge** mang tên `docker0` hoặc tên network riêng của Compose).
* Mỗi container khi khởi chạy được cấp một cặp giao diện mạng ảo (**veth pair - Virtual Ethernet**):
  * Một đầu cắm vào bên trong container (nhìn thấy dưới tên `eth0`).
  * Một đầu cắm vào Switch ảo `docker0` của máy Host.
* Mọi packet dữ liệu trao đổi giữa `backend` và `postgres` được luân chuyển trực tiếp qua Switch ảo này với tốc độ bus bộ nhớ (Memory Bandwidth), **không bao giờ phải đi ra ngoài Internet hay chạm vào card mạng vật lý của máy tính**.

---

### 1.2 Cơ Chế Phân Giải Tên Miền Tự Động (DNS Service Discovery)
Bên trong mỗi container, Docker tự động cấu hình file `/etc/resolv.conf` trỏ về địa chỉ:
```
nameserver 127.0.0.11
```
Đây là **Embedded DNS Server** tích hợp sẵn của Docker Daemon:
1. Khi mã nguồn Backend gọi:
   ```env
   DATABASE_URL=postgresql://teamhub:teamhub@postgres:5432/teamhub
   REDIS_URL=redis://redis:6379
   ```
2. Thư viện kết nối gửi truy vấn DNS hỏi: *"Địa chỉ IP của hostname `postgres` là gì?"*.
3. Docker DNS Server tra cứu bảng ánh xạ của Compose và trả về ngay lập tức IP ảo nội bộ: `172.20.0.2`.
4. **Tại sao tuyệt đối không dùng `localhost` trong container?**
   Vì mỗi container có một `net namespace` riêng, `localhost` (127.0.0.1) bên trong container chỉ trỏ tới chính nó. Nếu Backend gọi `localhost:5432`, nó sẽ tìm PostgreSQL ngay trong container backend $\rightarrow$ Báo lỗi `ECONNREFUSED` ngay lập tức!

---

### 1.3 Cơ Chế Ánh Xạ Cổng (Port Forwarding & iptables)
Trong [`docker-compose.dev.yml`](file:///d:/projects/persional-projects/Teamhub/infra/docker-compose.dev.yml):
```yaml
ports:
  - "5432:5432"
```
* **Cú pháp:** `CỔNG_HOST : CỔNG_CONTAINER`
* **Bản chất dưới Linux:** Docker Daemon tự động tạo một quy tắc chuyển tiếp gói tin trong bảng định tuyến **`iptables NAT PREROUTING`**:
  * Bất kỳ packet nào gửi tới cổng `5432` trên máy thật (Host) sẽ được đổi địa chỉ đích (DNAT) và chuyển tiếp thẳng vào card mạng ảo `172.20.0.2:5432` của container PostgreSQL.
  * Giúp các công cụ bên ngoài máy thật (DBeaver, TablePlus, RedisInsight) có thể kết nối vào Database bên trong container một cách trong suốt.

---

## 2. Quản Lý Bền Vững Dữ Liệu: So Sánh 3 Loại Mount Trong Docker

Mặc định, mọi file sinh ra trong container được lưu vào tầng **Writable Layer**. Tầng này có tính chất **Ephemeral (Phù du)**: container bị xóa là dữ liệu bị tiêu hủy sạch!

Để lưu trữ bền vững, Docker cung cấp 3 cơ chế Mount dữ liệu:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        3 LOẠI STORAGE MOUNT TRONG DOCKER               │
├─────────────────┬──────────────────┬─────────────────┬─────────────────┤
│ Tiêu chí        │ Named Volume     │ Bind Mount      │ tmpfs Mount     │
├─────────────────┼──────────────────┼─────────────────┼─────────────────┤
│ Nơi lưu trữ     │ Docker quản lý   │ Thư mục bất kỳ  │ Hoàn toàn trên  │
│                 │ (/var/lib/docker)│ trên máy Host   │ RAM của Host    │
│ Hiệu năng I/O   │ Cao nhất         │ Phụ thuộc Host  │ Cực nhanh (RAM) │
│ Trường hợp dùng │ Cơ sở dữ liệu    │ File cấu hình,  │ Lưu trữ tạm,    │
│                 │ (Postgres, MinIO)│ chia sẻ code dev│ Token/Key bảo mật
│ Độc lập OS      │ Có (Chuẩn hóa)   │ Phụ thuộc đường │ Chỉ chạy trên   │
│                 │                  │ dẫn máy Host    │ Linux           │
└─────────────────┴──────────────────┴─────────────────┴─────────────────┘
```

---

### 2.1 Named Volumes Trong TeamHub ([`infra/docker-compose.dev.yml`](file:///d:/projects/persional-projects/Teamhub/infra/docker-compose.dev.yml#L61-L63))

```yaml
services:
  postgres:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data

  minio:
    image: minio/minio:latest
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

* **Vòng đời độc lập:** Volume `postgres_data` tồn tại hoàn toàn tách biệt khỏi container.
* Khi bạn chạy:
  ```bash
  docker compose down      # Container bị hủy, mạng ảo bị xóa
  docker compose up -d     # Container mới được tạo ra
  ```
  Container mới sẽ tự động gắn lại vào đúng volume `postgres_data` cũ trên đĩa cứng $\rightarrow$ Toàn bộ dữ liệu tài khoản, bảng Kanban được bảo toàn 100%!

---

## 3. Quy Trình Sao Lưu & Phục Hồi Dữ Liệu Thực Tế (Backup & Restore)

Trong môi trường doanh nghiệp thực tế, làm thế nào để sao lưu một Docker Volume ra file nén mà không cần dừng toàn bộ server?

### 3.1 Kịch bản Backup Volume ra file `.tar.gz`:
Sử dụng một container phụ trợ siêu nhẹ (`alpine`) để mount volume và nén dữ liệu:
```bash
# Nén toàn bộ dữ liệu trong volume postgres_data ra file backup.tar.gz
docker run --rm \
  -v postgres_data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine \
  tar -czf /backup/postgres-backup-$(date +%Y%m%d).tar.gz -C /source .
```

### 3.2 Kịch bản Phục Hồi Dữ Liệu (Restore):
```bash
# Giải nén dữ liệu từ file backup ngược lại vào một volume mới
docker run --rm \
  -v postgres_data_new:/target \
  -v $(pwd)/backups:/backup \
  alpine \
  tar -xzf /backup/postgres-backup-20261010.tar.gz -C /target
```

---

## 🎯 Góc Nhìn Phỏng Vấn (Interview Cheatsheet)

### Câu hỏi 1: "Tại sao trong file cấu hình của Backend, chuỗi kết nối Database lại là `postgres:5432` mà không phải `localhost:5432`?"
* **Trả lời:** "Vì mỗi container Docker có một không gian mạng (`net namespace`) cô lập riêng biệt. Nếu dùng `localhost`, tiến trình Backend sẽ tìm kiếm PostgreSQL ngay bên trong container của chính nó và bị lỗi từ chối kết nối. Thay vào đó, Docker Compose tạo ra một mạng ảo **Bridge Network** chung và tích hợp sẵn **Embedded DNS Server** (127.0.0.11). Khi Backend gọi hostname `postgres`, DNS của Docker sẽ tự động phân giải tên service này thành địa chỉ IP ảo nội bộ của container PostgreSQL trong mạng bridge, giúp các service kết nối với nhau một cách an toàn và linh hoạt."

### Câu hỏi 2: "Sự khác biệt giữa Named Volume và Bind Mount trong Docker là gì? Khi nào nên dùng loại nào?"
* **Trả lời:** "**Named Volume** được Docker quản lý tập trung trong thư mục riêng của Docker daemon (thường là `/var/lib/docker/volumes/`), hoàn toàn độc lập với cấu trúc thư mục của máy host và có hiệu năng I/O tối ưu nhất cho cơ sở dữ liệu (như PostgreSQL, MinIO). Ngược lại, **Bind Mount** ánh xạ trực tiếp một đường dẫn cụ thể từ máy host vào container (ví dụ: `./config:/etc/config`). Bind Mount phụ thuộc vào hệ điều hành của host và thường được dùng cho các file cấu hình tĩnh hoặc khi cần chia sẻ mã nguồn trực tiếp trong quá trình phát triển (Hot Reloading)."
