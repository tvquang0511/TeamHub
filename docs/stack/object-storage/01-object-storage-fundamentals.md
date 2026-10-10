# 01 - Bản Chất Object Storage (S3 & MinIO Architecture)

---

## 1. Object Storage Là Gì? Vì Sao Không Lưu File Trên Ổ Cứng Server?

Khi mới học lập trình web, phương pháp lưu file phổ biến nhất là sử dụng thư viện `multer` để ghi file trực tiếp vào thư mục `public/uploads/` trên ổ đĩa của máy chủ Node.js:
```javascript
// ❌ CÁCH LÀM NGHIỆP DƯ (CHỈ DÙNG CHO DEMO CÁ NHÂN):
const upload = multer({ dest: 'public/uploads/' });
```

```
┌────────────────────────────────────────────────────────────────────────┐
│               TẠI SAO LƯU FILE TRÊN SERVER LÀ "THẢM HỌA"?              │
├─────────────────┬──────────────────────────────────────────────────────┤
│ Nguy Cơ         │ Hậu Quả Trong Môi Trường Doanh Nghiệp                │
├─────────────────┼──────────────────────────────────────────────────────┤
│ 1. Vi phạm tính │ Khi scale lên 3 server pods chạy sau Load Balancer,  │
│    Stateless    │ User A tải avatar lên Pod 1 thì Pod 2 và 3 không có. │
│                 │ Khi reload trang request rơi vào Pod 2 ──► Lỗi 404!  │
│ 2. Cạn kiệt đĩa │ Ổ SSD máy chủ ứng dụng có dung lượng cố định và đắt  │
│    cứng máy chủ │ đỏ. Hàng chục GB file tải lên làm đầy đĩa, khiến     │
│                 │ hệ điều hành máy chủ bị crash toàn bộ hệ thống!      │
│ 3. Mất dữ liệu  │ Trong Docker / Kubernetes, container có tính tạm thời│
│    khi Deploy   │ (Ephemeral). Mỗi lần Deploy phiên bản code mới,      │
│                 │ container cũ bị xóa kéo theo MẤT SẠCH TOÀN BỘ FILE!  │
└─────────────────┴──────────────────────────────────────────────────────┘
```

👉 **Giải pháp kiến trúc chuẩn mực:** Tách toàn bộ việc lưu trữ tệp tin ra một dịch vụ chuyên trách độc lập: **Object Storage (chuẩn AWS S3 hoặc MinIO)**.

---

## 2. So Sánh 3 Loại Hệ Thống Lưu Trữ Trong Khoa Học Máy Tính

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   SO SÁNH BLOCK STORAGE vs FILE STORAGE vs OBJECT STORAGE              │
├─────────────────┬──────────────────┬──────────────────┬────────────────────────────────┤
│ Tiêu chí        │ Block Storage    │ File Storage     │ Object Storage (S3 / MinIO)    │
├─────────────────┼──────────────────┼──────────────────┼────────────────────────────────┤
│ Cấu trúc vật lý │ Các khối 512B/4KB│ Cây thư mục phân │ Không gian phẳng (Flat         │
│                 │ dữ liệu thô      │ cấp (Folders)    │ Namespace, không có folder thực│
│ Giao thức truy  │ iSCSI, Fibre     │ POSIX, NFS, SMB  │ HTTP / HTTPS REST API          │
│ cập             │ Channel, NVMe    │                  │ (GET, PUT, DELETE)             │
│ Metadata đi kèm │ Không có (Chỉ có │ Giới hạn (Ngày   │ Phong phú không giới hạn       │
│                 │ địa chỉ block)   │ tạo, quyền chmod)│ (Custom Key-Value Tags)        │
│ Khả năng Scale  │ Giới hạn theo ổ  │ Khó scale trên   │ VÔ TẬN (Từ vài Gigabyte tới    │
│                 │ đĩa gắn vào máy  │ quy mô Petabyte  │ hàng trăm Petabyte dễ dàng)    │
│ Chi phí lưu trữ │ Rất đắt đỏ       │ Trung bình       │ Cực kỳ rẻ                      │
│ Trường hợp dùng │ OS, Database DB  │ Ổ đĩa chia sẻ nội│ Ảnh đại diện, Video, PDF, File │
│ điển hình       │ (Postgres data)  │ bộ công ty       │ đính kèm Kanban, Database Dumps│
└─────────────────┴──────────────────┴─────────────────┴────────────────────────────────┘
```

### 2.1 Cấu tạo của một Đối Tượng (Object) trong S3 / MinIO
Trong hệ điều hành Linux truyền thống, một file được quản lý bởi `inode`. Trong khi đó, một Đối tượng trong Object Storage gồm 3 thành phần cấu tạo:
1. **Dữ liệu nhị phân (Data Payload):** Chuỗi byte dữ liệu thực tế của tệp tin (ảnh PNG, tài liệu PDF, video MP4...).
2. **Metadata phong phú (System & Custom Metadata):**
   * *System Metadata:* `Content-Type` (ví dụ `application/pdf`), `Content-Length`, `ETag` (chuỗi MD5 băm của file), `Last-Modified`.
   * *Custom Metadata:* Các cặp Key-Value tùy biến do lập trình viên gắn thêm (ví dụ: `x-amz-meta-uploader: user_123`, `x-amz-meta-board-id: b_456`).
3. **Định danh duy nhất toàn cầu (Unique Key):**  
   Chuỗi định danh dạng `bucket/object-key`, ví dụ: `teamhub-attachments/cards/c_123/report.pdf`.

> **Sự thật về thư mục trong S3:**  
> S3 **hoàn toàn không có khái niệm Thư mục (Directory/Folder)**! Chuỗi `cards/c_123/report.pdf` thực chất chỉ là một chuỗi ký tự đơn nhất trong một không gian phẳng (Flat Namespace). Ký tự dấu gạch chéo `/` chỉ là tiền tố (Prefix) được giao diện UI giả lập thành hình cây thư mục để người dùng dễ nhìn.

---

## 3. Độ Bền Dữ Liệu 11 Số 9 (99.999999999% Durability)

Các hệ thống Object Storage chuẩn AWS S3 cam kết độ bền dữ liệu (**Data Durability**) lên tới **11 số 9 (99.999999999%)**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PHÂN BIỆT DURABILITY VÀ AVAILABILITY                 │
├─────────────────┬──────────────────────────────────────────────────────┤
│ Tiêu chí        │ Ý Nghĩa Kỹ Thuật Thực Tế                             │
├─────────────────┼──────────────────────────────────────────────────────┤
│ Durability      │ Khả năng DỮ LIỆU KHÔNG BỊ MẤT theo thời gian.        │
│ (Độ bền dữ liệu)│ Với 11 số 9: Nếu bạn lưu 10.000.000 file, xác suất   │
│                 │ thống kê bạn chỉ có thể mất 1 file sau 10.000 NĂM!   │
├─────────────────┼──────────────────────────────────────────────────────┤
│ Availability    │ Khả năng HỆ THỐNG TRUY CẬP ĐƯỢC tại một thời điểm    │
│ (Độ sẵn sàng)   │ (Uptime dịch vụ, ví dụ 99.99% = Mỗi năm hệ thống     │
│                 │ chỉ được phép bảo trì/gián đoạn tối đa 52 phút).     │
└─────────────────┴──────────────────────────────────────────────────────┘
```

---

## 4. Cơ Chế Erasure Coding & Chống Thối Dữ Liệu (Bit-Rot Protection)

Làm thế nào MinIO và AWS S3 đạt được độ bền 11 số 9 mà không cần phải nhân bản file làm 3 lần (vốn làm tốn gấp 3 lần dung lượng đĩa)?

### 4.1 Thuật toán Erasure Coding (Reed-Solomon Algorithm)
Thay vì lưu nguyên vẹn 1 file trên 1 ổ đĩa, MinIO chia nhỏ file thành $M$ khối dữ liệu (Data Blocks) và tính toán thêm $N$ khối chẵn lẻ (Parity Blocks):

```
GIẢ SỬ CỤM MINIO GỒM 12 Ổ ĐĨA (CẤU HÌNH: 8 DATA BLOCKS + 4 PARITY BLOCKS):

  FILE GỐC (8MB)
        │
        ▼ (Chia nhỏ và tính toán chẵn lẻ bằng thuật toán Reed-Solomon)
  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐ ┌─────┬─────┬─────┬─────┐
  │ D1  │ D2  │ D3  │ D4  │ D5  │ D6  │ D7  │ D8  │ │ P1  │ P2  │ P3  │ P4  │
  └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘ └─────┴─────┴─────┴─────┘
  (M = 8 Khối Dữ Liệu - Mỗi khối 1MB)               (N = 4 Khối Chẵn Lẻ Parity)
     │     │     │     │     │     │     │     │     │     │     │     │
     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼
   Ổ 1   Ổ 2   Ổ 3   Ổ 4   Ổ 5   Ổ 6   Ổ 7   Ổ 8   Ổ 9   Ổ 10  Ổ 11  Ổ 12
```

* **Khả năng chịu lỗi phi thường:**  
  Với cấu hình $8+4$, hệ thống **chấp nhận hỏng đồng thời tới 4 ổ đĩa bất kỳ** mà không hề mất một byte dữ liệu nào! MinIO chỉ cần gom lại 8 khối còn sống bất kỳ trong số 12 khối là có thể giải mã toán học khôi phục lại 100% file gốc.
* **Tối ưu chi phí:**  
  Hệ thống chỉ tốn thêm $\frac{4}{8} = 50\%$ dung lượng lưu trữ (Overhead $1.5\times$), rẻ hơn nhiều so với việc nhân bản 3 bản sao ($3.0\times$ Overhead).
* **Vượt trội so với RAID truyền thống:**  
  Các chuẩn RAID phần cứng cũ (RAID 5 / RAID 6) khi có 1 ổ đĩa hỏng sẽ mất hàng chục giờ để Rebuild toàn bộ ổ, trong quá trình đó nếu hỏng tiếp ổ thứ 2 là mất sạch dữ liệu. Erasure Coding khôi phục dữ liệu ở cấp độ từng Object phân tán trên toàn bộ các ổ còn lại, tốc độ hồi phục nhanh gấp hàng chục lần.

### 4.2 Chống Thối Dữ Liệu Lặng Lẽ (Silent Bit-Rot Protection)
Hiện tượng "Thối dữ liệu" (Bit-Rot) xảy ra khi các hạt từ tính trên đĩa cứng bị suy giảm hoặc do tác động của tia bức xạ vũ trụ, khiến một bit `0` tự động bị lật thành bit `1` mà hệ điều hành không hề hay biết.  
* **Giải pháp của MinIO:** Khi ghi dữ liệu, MinIO tính toán mã băm tốc độ cao **HighwayHash** (hoặc BLAKE2b) cho từng khối block và lưu vào metadata.
* Mỗi khi có request đọc file, MinIO tự động tính toán lại mã băm của khối dữ liệu trước khi ghép lại trả về cho Client. Nếu phát hiện bit bị sai lệch, nó lập tức dùng các khối Parity để tự động sửa lỗi (Self-Healing) và ghi đè khối đúng vào đĩa cứng!

---

## 5. Tính Nhất Quán Mạnh Mẽ (Strong Read-After-Write Consistency)

Trước năm 2020, AWS S3 sử dụng mô hình nhất quán sau cùng (Eventual Consistency) cho các câu lệnh `PUT` ghi đè hoặc `DELETE`. Nghĩa là khi bạn cập nhật file mới, người dùng khác đọc ngay sau đó có thể vẫn nhận về phiên bản cũ trong vài giây.

Hiện nay, **cả AWS S3 và MinIO đều cam kết Tính Nhất Quán Mạnh Mẽ (Strong Read-After-Write Consistency)**:
* Ngay sau khi câu lệnh `PUT` hoặc `DELETE` trả về mã `200 OK`, mọi yêu cầu `GET` tiếp theo từ bất kỳ Client nào trên toàn thế giới đều chắc chắn đọc được phiên bản dữ liệu mới nhất.
* Loại bỏ hoàn toàn các lỗi hiển thị ảnh cũ do Race Condition.

---

## 6. Cơ Chế Tải Lên Đa Phần (Multipart Upload) Cho File Lớn

Khi người dùng tải lên các tệp tin có kích thước lớn (từ 50MB lên tới hàng Terabyte):
* Nếu tải lên bằng một luồng duy nhất (`Single PUT`), khi mạng bị ngắt ở 99%, người dùng buộc phải tải lại từ đầu từ 0%!

### Luồng hoạt động của Multipart Upload:
```
[ CLIENT ]                                                         [ MINIO / S3 ]
    │                                                                   │
    │───(1) InitiateMultipartUpload (Khởi tạo phiên tải)───────────────►│
    │◄──(2) Trả về: UploadId = "upload_xyz123"─────────────────────────┤
    │                                                                   │
    │───(3) Upload Part 1 (File bytes 0 - 5MB) ────────────────────────►│
    │◄──(4) Trả về: ETag_1 = "hash_part_1" ─────────────────────────────┤
    │                                                                   │
    │───(5) Upload Part 2 (File bytes 5MB - 10MB) [Chạy Song Song]─────►│
    │◄──(6) Trả về: ETag_2 = "hash_part_2" ─────────────────────────────┤
    │                                                                   │
    │───(7) CompleteMultipartUpload (Gửi danh sách tất cả ETag)────────►│
    │◄──(8) Ghép hoàn tất các phần thành 1 Object duy nhất trên đĩa────┤
```

* **Ưu điểm vượt trội:**
  1. **Tải lên song song (Parallel Uploading):** Client có thể mở 4 luồng upload đồng thời 4 phần của file, tận dụng tối đa băng thông đường truyền mạng.
  2. **Khả năng phục hồi sự cố (Fault-Tolerance):** Nếu Phần 3 bị rớt mạng, Client chỉ cần tải lại duy nhất Phần 3 mà không cần tải lại toàn bộ file.

---

## 🎯 Góc Nhìn Phỏng Vấn (Interview Cheatsheet)

### Câu hỏi 1: "Sự khác biệt căn bản giữa Block Storage, File Storage và Object Storage là gì?"
* **Trả lời:**  
  "Sự khác biệt căn bản nằm ở cấu trúc dữ liệu và phương thức giao tiếp:  
  1. **Block Storage:** Lưu trữ dữ liệu dưới dạng các khối nhị phân thô không có metadata, giao tiếp qua giao thức kênh cấp thấp như iSCSI/NVMe, tốc độ cực nhanh, chuyên dùng cho ổ đĩa hệ điều hành và Database.  
  2. **File Storage:** Tổ chức dữ liệu theo cây thư mục phân cấp cha-con (Hierarchical tree), truy cập thông qua các giao thức mạng chia sẻ như NFS/SMB, phù hợp cho việc chia sẻ file nội bộ văn phòng.  
  3. **Object Storage:** Lưu trữ dữ liệu trong một không gian phẳng (Flat Namespace) không có thư mục thực sự. Mỗi đối tượng gồm dữ liệu thô, metadata phong phú tùy biến và một định danh duy nhất (Key). Truy cập trực tiếp thông qua giao thức HTTP REST API tiêu chuẩn, có khả năng mở rộng dung lượng gần như vô tận với chi phí thấp nhất."

### Câu hỏi 2: "Cơ chế Erasure Coding trong Object Storage hoạt động như thế nào và có ưu điểm gì so với cấu hình RAID truyền thống?"
* **Trả lời:**  
  "Erasure Coding (sử dụng thuật toán Reed-Solomon) hoạt động bằng cách chia nhỏ tệp tin gốc thành $M$ khối dữ liệu (Data Blocks) và tính toán thêm $N$ khối chẵn lẻ (Parity Blocks) rồi phân tán lên các ổ đĩa độc lập. Hệ thống cho phép hỏng đồng thời tới $N$ ổ đĩa bất kỳ mà vẫn khôi phục được nguyên vẹn dữ liệu gốc chỉ từ $M$ khối còn sống.  
  So với RAID truyền thống:  
  1. **Tiết kiệm dung lượng:** Không cần nhân bản gấp 3 lần dữ liệu ($3\times$ replication) mà chỉ tốn thêm một tỷ lệ chẵn lẻ nhỏ (ví dụ cấu hình $8+4$ chỉ tốn thêm 50% dung lượng đĩa).  
  2. **Tốc độ khôi phục nhanh vượt trội:** RAID truyền thống khôi phục dữ liệu ở cấp độ toàn bộ ổ đĩa vật lý (mất hàng chục giờ), trong khi Erasure Coding khôi phục song song ở cấp độ từng Object phân tán trên tất cả các ổ đĩa còn lại, giảm thiểu tối đa nguy cơ mất dữ liệu do hỏng ổ đĩa thứ hai trong lúc đang rebuild."

### Câu hỏi 3: "Độ bền 11 số 9 (11 Nines Durability) khác gì với Độ sẵn sàng (Availability)?"
* **Trả lời:**  
  "**Độ bền (Durability)** đo lường xác suất dữ liệu không bị mất hoặc hỏng vĩnh viễn trên hệ thống lưu trữ theo thời gian. Con số 99.999999999% (11 số 9) có nghĩa là nếu bạn lưu trữ 10 triệu đối tượng, theo xác suất thống kê chỉ có thể mất 1 đối tượng sau mỗi 10.000 năm nhờ cơ chế Erasure Coding và Bit-rot protection.  
  Ngược lại, **Độ sẵn sàng (Availability)** đo lường tỷ lệ thời gian hệ thống hoạt động bình thường và sẵn sàng phản hồi các yêu cầu của người dùng tại thời điểm truy cập (Uptime của dịch vụ, ví dụ 99.99% tương đương với thời gian ngừng hoạt động tối đa 52 phút mỗi năm). Dữ liệu có thể có độ bền 11 số 9 (không bao giờ mất) nhưng vẫn có lúc tạm thời không truy cập được nếu mạng của trung tâm dữ liệu bị gián đoạn."
