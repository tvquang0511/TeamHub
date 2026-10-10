# 01 - Bản Chất Container & Điều Phối Docker Compose (Multi-Service Orchestration)

---

## 1. Container Là Gì? Container Khác Gì Máy Ảo (Virtual Machine)?

Trước kỷ nguyên Containerization, một vấn đề kinh điển trong ngành phần mềm là: *"Code chạy bình thường trên máy lập trình viên, nhưng khi đưa lên Server lại bị lỗi."* Nguyên nhân xuất phát từ sự sai lệch về phiên bản Node.js, gói thư viện hệ điều hành (Debian/Alpine), biến môi trường và cấu hình mạng.

### 1.1 So Sánh Bản Chất Kỹ Thuật Giữa VM và Container

```
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│        VIRTUAL MACHINE (VM)          │     │          DOCKER CONTAINER            │
├──────────────────────────────────────┤     ├──────────────────────────────────────┤
│  [ App 1 ]   [ App 2 ]   [ App 3 ]   │     │  [ App 1 ]   [ App 2 ]   [ App 3 ]   │
│  [ Libs  ]   [ Libs  ]   [ Libs  ]   │     │  [ Libs  ]   [ Libs  ]   [ Libs  ]   │
│  [ Guest OS: Ubuntu / Alpine ]       │     │  [ Docker Engine Daemon (containerd)]│
│  [ Hypervisor: KVM / ESXi / VMware ] │     │  [ Host OS Kernel: Linux (Shared) ]  │
│  [ Physical Hardware: CPU/RAM/Disk ] │     │  [ Physical Hardware: CPU/RAM/Disk ] │
└──────────────────────────────────────┘     └──────────────────────────────────────┘
```

| Tiêu chí so sánh | Virtual Machine (Máy Ảo) | Docker Container |
| :--- | :--- | :--- |
| **Cơ chế cô lập** | Ảo hóa phần cứng (Hardware Virtualization) | Cô lập ở tầng nhân hệ điều hành (OS-level Isolation) |
| **Hệ điều hành khách** | Mỗi VM chạy một **Guest OS hoàn chỉnh** | Dùng chung **Nhân hệ điều hành của máy chủ (Host Kernel)** |
| **Dung lượng lưu trữ**| Hàng chục Gigabytes (GB) cho mỗi VM | Vài chục đến vài trăm Megabytes (MB) |
| **Thời gian khởi động**| Vài chục giây đến vài phút (phải boot OS) | **Vài trăm mili-giây** (chỉ khởi chạy một tiến trình) |
| **Hiệu năng CPU/RAM** | Tiêu tốn overhead lớn để nuôi Guest OS | Gần như nguyên bản (**Near-native performance**) |

---

## 2. Các Trụ Cột Nhân Linux Đằng Sau Docker (Linux Primitives)

Docker không phải là một công nghệ ảo hóa độc lập, mà là một công cụ đóng gói tinh tế tận dụng 3 tính năng cốt lõi của **Nhân Linux (Linux Kernel)**:

```
                                  [ DOCKER CONTAINER ]
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
       [ 1. NAMESPACES ]             [ 2. CGROUPS ]              [ 3. OVERLAYFS ]
       Cô lập những gì               Giới hạn tài nguyên          Cấu trúc lưu trữ
       tiến trình nhìn thấy          tiến trình được dùng         nhiều tầng (Layers)
```

### 2.1 Namespaces (Cô lập góc nhìn của tiến trình)
Linux cung cấp các không gian tên độc lập để một tiến trình bên trong container hoàn toàn không nhìn thấy thế giới bên ngoài:
* **`pid namespace`:** Tiến trình chính bên trong container nhìn thấy mình là **PID 1** (Init process), nhưng thực tế trên máy chủ Host nó chỉ là một tiến trình bình thường với PID như `14520`.
* **`net namespace`:** Container sở hữu một card mạng ảo riêng biệt (`eth0`), bảng định tuyến riêng và dải cổng mạng riêng (ví dụ: container mở cổng `5432` mà không đụng độ với cổng `5432` của máy host).
* **`mnt namespace`:** Cô lập cây thư mục filesystem (gốc `/`).
* **`ipc namespace`:** Ngăn chặn các tiến trình chia sẻ bộ nhớ (Shared Memory / Semaphores) với máy host.
* **`uts namespace`:** Cho phép container có hostname riêng (ví dụ: `teamhub-postgres`).

### 2.2 Cgroups (Control Groups - Kiểm soát tài nguyên)
Ngăn chặn một container bị lỗi tràn bộ nhớ (Memory Leak) làm sập toàn bộ máy chủ vật lý:
* **Giới hạn RAM:** Quy định container chỉ được dùng tối đa 1GB RAM. Nếu vượt quá, nhân Linux kích hoạt OOM Killer (Out Of Memory) để tự hủy container đó mà không làm chết các dịch vụ khác.
* **Giới hạn CPU:** Phân bổ tỷ lệ % CPU giữa các container (`cpu_shares`).

### 2.3 OverlayFS & Layered Storage Architecture
Hình ảnh Docker Image không phải là một khối nén đơn lẻ mà là một chồng các tầng chỉ đọc (**Read-Only Layers**) xếp chồng lên nhau:

```
┌────────────────────────────────────────────────────────┐
│  CONTAINER LAYER (Read/Write) : Dữ liệu tạm khi chạy   │
├────────────────────────────────────────────────────────┤
│  IMAGE LAYER 3 (Read-Only)    : npm install (deps)     │
├────────────────────────────────────────────────────────┤
│  IMAGE LAYER 2 (Read-Only)    : Node.js 20 runtime     │
├────────────────────────────────────────────────────────┤
│  IMAGE LAYER 1 (Read-Only)    : Alpine Linux Base OS   │
└────────────────────────────────────────────────────────┘
```
* **Kỹ thuật Copy-on-Write (CoW):** Nếu bạn chạy 5 container cùng từ 1 image `postgres:16`, cả 5 container đều dùng chung các Image Layer bên dưới trên đĩa cứng. Chỉ khi container có thao tác sửa đổi file, nó mới chép file đó lên **Container Layer** của riêng mình $\rightarrow$ Tiết kiệm hàng chục GB dung lượng đĩa!

---

## 3. Kiến Trúc Hai Chế Độ Môi Trường Trong TeamHub

Dự án TeamHub thiết kế 2 cấu hình Docker Compose độc lập nhằm cân bằng giữa **Tốc độ phát triển (Developer Experience)** và **Tính sẵn sàng Production**:

### 3.1 Chế Độ Phát Triển Nhanh ([`infra/docker-compose.dev.yml`](file:///d:/projects/persional-projects/Teamhub/infra/docker-compose.dev.yml))
* **Mục tiêu:** Tối ưu hóa chu kỳ phản hồi sửa code (Feedback Loop).
* **Cơ chế:** Docker chỉ đảm nhiệm việc chạy **3 container hạ tầng lõi**:
  * `postgres:16`: Port `5432:5432`
  * `redis:7`: Port `6379:6379`
  * `minio/minio`: Port `9000:9000` và `9001:9001` (Web Console)
* Mã nguồn `backend` và `frontend` được chạy trực tiếp bằng `npm run dev` trên máy thật:
  * Backend tận dụng `nodemon` tự restart server khi đổi code TypeScript.
  * Frontend tận dụng Vite HMR (Hot Module Replacement) cập nhật giao diện trong vài mili-giây.

### 3.2 Chế Độ Đóng Gói Toàn Diện ([`infra/docker-compose.yml`](file:///d:/projects/persional-projects/Teamhub/infra/docker-compose.yml))
* **Mục tiêu:** Đóng gói nguyên khối thành một hệ thống tự trị (Self-contained).
* Toàn bộ 6 service (`frontend`, `backend`, `worker`, `postgres`, `redis`, `minio`) được build thành image và chạy chung trong mạng ảo nội bộ. Bất kỳ ai chỉ cần clone repo và chạy:
  ```bash
  docker compose -f infra/docker-compose.yml up -d
  ```
  là có ngay toàn bộ môi trường chạy hoàn chỉnh mà không cần cài đặt thêm bất kỳ công cụ nào trên máy tính.

---

## 4. Mẫu Thiết Kế One-Shot Container: `minio-init`

Một thách thức lớn khi triển khai MinIO Object Storage tự động:
* Khi container `minio` khởi động lần đầu, nó chỉ là một máy chủ lưu trữ rỗng, **chưa hề có sẵn các Bucket** (`teamhub` và `teamhub-public`).
* Nếu Backend khởi động lên và gửi yêu cầu tạo Presigned URL vào Bucket chưa tồn tại, hệ thống sẽ sập với lỗi `NoSuchBucket`!

### Giải Pháp Tinh Tế Của TeamHub:
Tại [`infra/docker-compose.dev.yml`](file:///d:/projects/persional-projects/Teamhub/infra/docker-compose.dev.yml#L29-L54), TeamHub sử dụng một **One-Shot Container** mang tên `minio-init` sử dụng image công cụ `minio/mc` (MinIO Client):

```yaml
minio-init:
  image: minio/mc:latest
  container_name: teamhub-minio-init
  depends_on:
    - minio
  entrypoint:
    - /bin/sh
    - -c
    - |
      # 1. Thăm dò và đợi MinIO Server sẵn sàng mở cổng kết nối
      until mc alias set local http://minio:9000 teamhub teamhub-secret; do sleep 1; done

      # 2. Tạo Bucket Private cho tệp đính kèm thẻ (chặn tải nặc danh)
      mc mb -p local/teamhub || true
      mc anonymous set none local/teamhub || true

      # 3. Tạo Bucket Public cho Avatar và Background (cho phép tải công khai)
      mc mb -p local/teamhub-public || true
      mc anonymous set download local/teamhub-public || true

      # 4. Cấu hình chính sách vòng đời ILM: Tự hủy file tạm trong tmp/ sau 7 ngày
      mc ilm add --expire-days 7 --prefix "tmp/" local/teamhub || \
        mc ilm rule add --expire-days 7 --prefix "tmp/" local/teamhub || true
```

* **Vòng đời:** Container này chạy xong kịch bản cấu hình trên trong khoảng 2 giây rồi **tự động thoát (Exited với code 0)** mà không hề tiêu tốn RAM của hệ thống sau đó.
* **Tự động hóa 100%:** Giúp loại bỏ hoàn toàn các bước cấu hình thủ công bằng tay khi dựng môi trường mới.

---

## 5. Quy Trình Dừng Dịch Vụ An Toàn (Graceful Shutdown)

Khi bạn chạy lệnh `docker compose stop` hoặc container bị khởi động lại:
1. Docker gửi tín hiệu **`SIGTERM` (Signal Terminate)** tới tiến trình PID 1 bên trong container.
2. Ứng dụng Node.js (cả Backend và Worker) bắt sự kiện này:
   * Ngừng nhận các HTTP Request mới.
   * Chờ các request đang xử lý dở dang hoàn tất.
   * Worker hoàn thành nốt job BullMQ hiện tại rồi đóng kết nối Redis và PostgreSQL.
3. Nếu sau thời gian ân hạn (mặc định 10 giây) mà tiến trình chưa dừng, Docker mới gửi tín hiệu cưỡng chế **`SIGKILL` (Signal Kill)** để buộc dừng tiến trình.
4. Cơ chế này đảm bảo không bao giờ làm đứt ngang một giao dịch cơ sở dữ liệu hay làm hỏng dữ liệu trên đĩa.

---

## 🎯 Góc Nhìn Phỏng Vấn (Interview Cheatsheet)

### Câu hỏi 1: "Container khác gì Máy ảo (VM)? Những tính năng nào của nhân Linux giúp Docker hoạt động?"
* **Trả lời:** "Máy ảo (VM) ảo hóa ở tầng phần cứng và phải chạy một Hệ điều hành khách (Guest OS) hoàn chỉnh, dẫn đến kích thước nặng và khởi động chậm. Ngược lại, Docker là ảo hóa ở tầng hệ điều hành, dùng chung nhân Linux (Host Kernel) của máy chủ vật lý. Docker hoạt động dựa trên 3 tính năng cốt lõi của Linux: **Namespaces** (cô lập Process ID, Mạng, Mount Filesystem), **Cgroups** (giới hạn dung lượng RAM và % CPU mà container được phép dùng), và **OverlayFS** (quản lý hệ thống file theo các tầng layer chỉ đọc kết hợp Copy-on-Write). Nhờ vậy, container khởi động chỉ trong vài trăm mili-giây và tiêu tốn rất ít tài nguyên."

### Câu hỏi 2: "Tại sao trong file docker-compose của dự án lại có container `minio-init`? Mục đích của nó là gì?"
* **Trả lời:** "Container `minio-init` được áp dụng theo mẫu thiết kế **One-Shot Initialization Pattern**. Vì MinIO khi mới khởi động lần đầu chưa có sẵn các Bucket, container này sử dụng công cụ MinIO Client (`minio/mc`) để thăm dò cho tới khi MinIO mở cổng, sau đó tự động tạo các bucket `teamhub` và `teamhub-public`, cấu hình quyền truy cập công khai/riêng tư và thiết lập quy tắc tự dọn dẹp file tạm sau 7 ngày. Khi hoàn thành cấu hình, container tự động tắt và giải phóng RAM hoàn toàn, giúp dự án tự động hóa 100% việc chuẩn bị môi trường mà không cần thao tác tay."
