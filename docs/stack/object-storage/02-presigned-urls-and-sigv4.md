# 02 - Chữ Ký Số SigV4 & Cơ Chế Presigned URLs Chuyên Sâu

---

## 1. Presigned URL Là Gì? Vì Sao Đây Là Chuẩn Bảo Mật Số 1?

Trong mô hình kiến trúc **Direct-to-Storage Upload**, trình duyệt người dùng (Client) gửi tệp tin trực tiếp lên máy chủ MinIO / AWS S3 thông qua một đường dẫn URL ủy quyền đặc biệt gọi là **Presigned URL**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   VÌ SAO CẦN PRESIGNED URL?                            │
├─────────────────┬──────────────────────────────────────────────────────┤
│ Nguy Cơ         │ Giải Pháp Của Presigned URL                          │
├─────────────────┼──────────────────────────────────────────────────────┤
│ Lộ Secret Key   │ Backend dùng Secret Key ký ra URL tạm thời. Trình    │
│                 │ duyệt thực hiện upload mà HOÀN TOÀN KHÔNG BIẾT       │
│                 │ Secret Key của quản trị viên đám mây!                │
│ Quá tải Backend │ File 100MB được đẩy thẳng từ Browser ──► MinIO.      │
│                 │ Server Node.js không tốn 1 byte RAM hay CPU nào để   │
│                 │ làm trạm trung chuyển trung gian!                    │
│ Giới hạn quyền  │ URL chỉ có hiệu lực cho đúng 1 hành động (`PUT`),    │
│                 │ đúng 1 đường dẫn file, và tự hủy sau 300 giây.       │
└─────────────────┴──────────────────────────────────────────────────────┘
```

**Cấu trúc một Presigned URL chuẩn S3 trong thực tế:**
```
https://storage.teamhub.vn/teamhub-attachments/cards/c_123/mockup.png?
  X-Amz-Algorithm=AWS4-HMAC-SHA256&
  X-Amz-Credential=teamhub%2F20261010%2Fus-east-1%2Fs3%2Faws4_request&
  X-Amz-Date=20261010T153000Z&
  X-Amz-Expires=300&
  X-Amz-SignedHeaders=host&
  X-Amz-Signature=8f5b3a4c1e2d9a8b7c6e5f...
```

---

## 2. Giải Mã Toán Học Thuật Toán Ký AWS Signature Version 4 (SigV4)

Thuật toán **AWS Signature Version 4 (SigV4)** là tiêu chuẩn mật mã học khắt khe hàng đầu thế giới được Amazon Web Services thiết lập.  
TeamHub tự hiện thực hóa thuật toán này bằng module `crypto` nguyên bản của Node.js trong [`backend/src/infrastructure/storage/minio.presign.put.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/infrastructure/storage/minio.presign.put.ts) qua 4 bước toán học chặt chẽ:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   QUY TRÌNH KÝ SỐ MẬT MÃ SIGV4                         │
├────────────────────────────────────────────────────────────────────────┤
│ Bước 1: Chuẩn hóa Yêu cầu ──► Hashed Canonical Request (SHA-256)       │
│ Bước 2: Tạo Chuỗi cần Ký  ──► String to Sign                           │
│ Bước 3: Dẫn xuất Khóa ký  ──► 4-Tier Derived Signing Key (HMAC-SHA256) │
│ Bước 4: Tính Chữ ký cuối  ──► Final Hexadecimal Signature              │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Bước 1: Tạo Yêu Cầu Chuẩn Hóa (Canonical Request)
Do các Client và Proxy có thể sắp xếp thứ tự các tham số query hoặc viết hoa/thường header khác nhau, thuật toán yêu cầu chuẩn hóa mọi thành phần của request theo một định dạng duy nhất:

```
CanonicalRequest = 
  HTTPMethod + "\n" +
  CanonicalURI + "\n" +
  CanonicalQueryString + "\n" +
  CanonicalHeaders + "\n" +
  SignedHeaders + "\n" +
  HashedPayload
```

1. **HTTPMethod:** `PUT` (cho tải lên) hoặc `GET` (cho tải xuống).
2. **CanonicalURI:** Đường dẫn tài nguyên được mã hóa chuẩn URI RFC 3986 (ví dụ: `/teamhub-attachments/cards/c_123/file.png`).
3. **CanonicalQueryString:** Các tham số Query được **sắp xếp theo thứ tự bảng chữ cái (Lexicographically sorted)** và mã hóa URL.
4. **CanonicalHeaders:** Danh sách các header được chuyển về chữ thường, loại bỏ khoảng trắng thừa và sắp xếp theo bảng chữ cái.
5. **SignedHeaders:** Danh sách tên các header được ký nối với nhau bằng dấu chấm phẩy (ví dụ: `host`).
6. **HashedPayload:** Đối với Presigned URL, vì Client chưa upload file nên nội dung file chưa có sẵn, giá trị này luôn là hằng số chuỗi: `"UNSIGNED-PAYLOAD"`.

Sau đó, tính mã băm SHA-256 của chuỗi chuẩn hóa:
$$\text{HashedCanonicalRequest} = \text{SHA256}(\text{CanonicalRequest})$$

---

### Bước 2: Tạo Chuỗi Cần Ký (String to Sign)
Chuỗi này liên kết thuật toán băm, mốc thời gian và phạm vi ủy quyền (Scope):

```
StringToSign = 
  "AWS4-HMAC-SHA256" + "\n" +
  RequestDateTime + "\n" +
  DateStamp + "/" + Region + "/" + Service + "/aws4_request" + "\n" +
  HashedCanonicalRequest
```

* `RequestDateTime`: Mốc thời gian ISO 8601 cơ bản không có dấu gạch ngang (ví dụ: `20261010T153000Z`).
* `DateStamp`: Chuỗi ngày 8 chữ số (`20261010`).
* `CredentialScope`: Giới hạn phạm vi chỉ có hiệu lực cho ngày hôm đó, tại vùng đó (`us-east-1`), và cho đúng dịch vụ `s3`.

---

### Bước 3: Dẫn Xuất Khóa Ký Đa Tầng (4-Tier Derivation Key)
Đây là thiết kế mật mã học thông minh nhất của AWS:  
**TUYỆT ĐỐI KHÔNG DÙNG TRỰC TIẾP SECRET KEY ĐỂ KÝ DỮ LIỆU!**  
Thay vào đó, hệ thống dẫn xuất một khóa ký tạm thời (`kSigning`) thông qua chuỗi hàm băm HMAC-SHA256 lồng nhau 4 cấp:

```
[ SECRET KEY ]
      │
      ▼ HMAC-SHA256("AWS4" + SecretKey, DateStamp: "20261010")
  [ kDate ]
      │
      ▼ HMAC-SHA256(kDate, Region: "us-east-1")
  [ kRegion ]
      │
      ▼ HMAC-SHA256(kRegion, Service: "s3")
  [ kService ]
      │
      ▼ HMAC-SHA256(kService, "aws4_request")
  [ kSigning ]  ◄── (Khóa ký cuối cùng chỉ có hiệu lực trong ngày cho S3)
```

**Tại sao cơ chế 4 tầng này an toàn tuyệt đối?**
* **Ngăn chặn rò rỉ diện rộng (Blast Radius Containment):** Khóa `kSigning` chỉ có giá trị cho một ngày cụ thể (`DateStamp`), một vùng cụ thể (`Region`) và một dịch vụ cụ thể (`Service`).
* Nếu bộ nhớ RAM của một máy chủ biên vô tình bị lộ khóa `kSigning`, kẻ tấn công **hoàn toàn không thể đảo ngược để tìm ra Secret Key gốc**, và cũng không thể dùng khóa này để ký request cho ngày hôm sau hoặc truy cập vào dịch vụ khác (như AWS DynamoDB hay SQS)!

---

### Bước 4: Tính Chữ Ký Cuối Cùng (Final Signature)
Lấy chuỗi `StringToSign` ở Bước 2 mã hóa HMAC-SHA256 với khóa `kSigning` ở Bước 3:
```typescript
const signature = crypto
  .createHmac("sha256", kSigning)
  .update(stringToSign)
  .digest("hex");
```
Gán giá trị chữ ký này vào tham số `X-Amz-Signature` trên đường dẫn URL.

---

## 3. Hiện Thực Hóa Native Trong Mã Nguồn TeamHub

Dưới đây là phần trích xuất mã nguồn thực tế viết bằng Node.js `crypto` trong [`backend/src/infrastructure/storage/minio.presign.put.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/infrastructure/storage/minio.presign.put.ts):

```typescript
import crypto from "node:crypto";

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}
```

* **Điểm sáng kỹ thuật:** TeamHub không cần cài đặt gói thư viện cồng kềnh `@aws-sdk/s3-request-presigner` (vốn nặng hàng chục Megabytes với hàng trăm dependencies phụ thuộc), mà tận dụng 100% module mật mã học nguyên bản của Node.js, giúp khởi động ứng dụng nhanh và giảm thiểu tối đa lỗ hổng bảo mật chuỗi cung ứng (Supply Chain Attack).

---

## 4. Path-Style vs Virtual-Hosted-Style URLs

Khi làm việc với Object Storage, có hai định dạng URL phổ biến:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   SO SÁNH PATH-STYLE VÀ VIRTUAL-HOSTED STYLE           │
├───────────────────┬────────────────────────────────────────────────────┤
│ Định dạng         │ Cú Pháp & Địa Chỉ URL                              │
├───────────────────┼────────────────────────────────────────────────────┤
│ Path-Style        │ http://localhost:9000/teamhub-attachments/file.png │
│                   │ (Bucket nằm sau dấu gạch chéo đầu tiên)            │
├───────────────────┼────────────────────────────────────────────────────┤
│ Virtual-Hosted    │ http://teamhub-attachments.storage.vn/file.png     │
│                   │ (Bucket đóng vai trò là Subdomain của Host)        │
└───────────────────┴────────────────────────────────────────────────────┘
```

* **Vì sao TeamHub chọn Path-Style trong môi trường Docker?**  
  Trong môi trường Local Development chạy bằng Docker Compose, domain máy chủ là `localhost:9000`. Hệ điều hành và file `hosts` cục bộ không thể tự động phân giải DNS Wildcard cho subdomain dạng `teamhub-attachments.localhost`. Sử dụng **Path-Style** cho phép ứng dụng chạy mượt mà trên mọi môi trường phát triển mà không yêu cầu cài đặt DNS Server giả lập.

---

## 5. Xử Lý Các Lỗi Thường Gặp Khi Triển Khai SigV4 Trên Production

### 5.1 Lỗi `SignatureDoesNotMatch` (Lỗi phổ biến nhất)
* **Nguyên nhân cốt lõi:** Có sự sai lệch giữa các header được khai báo trong `SignedHeaders` khi Backend tính toán chữ ký và các header thực tế mà Trình duyệt gửi lên trong lệnh `HTTP PUT`.  
  *Ví dụ:* Backend tính chữ ký với `SignedHeaders=host`. Nhưng khi Frontend gọi `fetch()`, lập trình viên vô tình thêm header `headers: { 'Content-Type': 'image/png' }`. MinIO khi nhận được request thấy có thêm `Content-Type` nhưng trong chữ ký không có $\rightarrow$ MinIO từ chối với lỗi `SignatureDoesNotMatch`!
* **Cách khắc phục:**
  1. *Cách 1:* Phía Frontend chỉ gửi đúng các header đã được ký (thông thường chỉ cần để trình duyệt tự quản lý `Host`).
  2. *Cách 2:* Nếu muốn bắt buộc file phải có đúng `Content-Type`, Backend khi tạo Presigned URL phải đưa `content-type` vào danh sách `SignedHeaders` và truyền giá trị MIME Type đó vào chuỗi `CanonicalHeaders`.

### 5.2 Lỗi `RequestTimeTooSkewed` (Lệch đồng hồ thời gian)
* **Nguyên nhân:** Đồng hồ hệ thống của máy chủ Backend hoặc máy chủ MinIO bị chạy sai lệch quá 15 phút so với giờ chuẩn quốc tế (UTC). AWS và MinIO sẽ từ chối mọi request có `X-Amz-Date` chênh lệch quá 15 phút để chống tấn công phát lại (Replay Attack).
* **Cách khắc phục:** Cài đặt tiến trình đồng bộ thời gian mạng **NTP Daemon (`chrony` hoặc `systemd-timesyncd`)** trên tất cả các máy chủ máy ảo.

### 5.3 Lỗi CORS Preflight (`403 Forbidden` trên lệnh `OPTIONS`)
* **Hiện tượng:** Trình duyệt trước khi gửi lệnh `PUT` sẽ tự động gửi một lệnh `OPTIONS` kiểm tra chính sách bảo mật (CORS Preflight). Nếu MinIO chưa được bật cấu hình CORS cho bucket đó, trình duyệt sẽ chặn đứng lệnh tải lên ngay lập tức.
* **Cách khắc phục:** Định cấu hình chính sách CORS trong container `minio-init` cho phép các method `["GET", "PUT", "HEAD", "OPTIONS"]` và cho phép origin của ứng dụng Frontend.

---

## 🎯 Góc Nhìn Phỏng Vấn (Interview Cheatsheet)

### Câu hỏi 1: "Thuật toán AWS Signature Version 4 (SigV4) hoạt động theo những bước nào?"
* **Trả lời:**  
  "Thuật toán AWS SigV4 bao gồm 4 bước toán học chính:  
  1. **Tạo Canonical Request:** Chuẩn hóa phương thức HTTP, URI, sắp xếp các tham số Query String theo bảng chữ cái, chuẩn hóa các Header và gán payload (đối với Presigned URL là `'UNSIGNED-PAYLOAD'`), sau đó tính mã băm SHA-256 của chuỗi này.  
  2. **Tạo String to Sign:** Kết hợp mã định danh thuật toán (`AWS4-HMAC-SHA256`), mốc thời gian dạng ISO 8601 (`X-Amz-Date`), phạm vi ủy quyền (Scope gồm ngày/vùng/dịch vụ), và mã băm của Canonical Request ở bước 1.  
  3. **Dẫn xuất khóa ký 4 tầng (Key Derivation):** Sử dụng hàm băm HMAC-SHA256 lồng nhau để dẫn xuất từ `Secret Key` qua 4 cấp: `kDate` $\rightarrow$ `kRegion` $\rightarrow$ `kService` $\rightarrow$ `kSigning`.  
  4. **Tính chữ ký cuối cùng:** Mã hóa chuỗi String to Sign bằng khóa `kSigning` bằng thuật toán HMAC-SHA256 để tạo ra chuỗi Hexadecimal Signature gán vào URL."

### Câu hỏi 2: "Tại sao thuật toán SigV4 lại sử dụng cơ chế dẫn xuất khóa ký 4 tầng thay vì dùng trực tiếp Secret Key?"
* **Trả lời:**  
  "Cơ chế dẫn xuất khóa ký 4 tầng (4-Tier Key Derivation) là một nguyên lý thiết kế phòng thủ theo chiều sâu (Defense in Depth) nhằm giới hạn phạm vi ảnh hưởng (Blast Radius Containment):  
  Khóa ký `kSigning` được sinh ra chỉ có hiệu lực duy nhất trong ngày hôm đó (`DateStamp`), tại vùng trung tâm dữ liệu đó (`Region`), và cho đúng dịch vụ lưu trữ (`s3`). Nếu hệ thống máy chủ biên hoặc bộ nhớ RAM vô tình bị rò rỉ khóa `kSigning` này, kẻ tấn công hoàn toàn không thể đảo ngược toán học để suy ra Secret Key gốc của quản trị viên. Đồng thời, họ cũng không thể dùng khóa này vào ngày hôm sau, hoặc dùng nó để tấn công vào các dịch vụ đám mây nhạy cảm khác như cơ sở dữ liệu hay hàng đợi tin nhắn."

### Câu hỏi 3: "Khi triển khai tính năng tải file qua Presigned URL, lỗi `SignatureDoesNotMatch` thường do đâu và làm thế nào để phòng tránh?"
* **Trả lời:**  
  "Lỗi `SignatureDoesNotMatch` xuất hiện khi chuỗi chữ ký do Client gửi lên khác với chữ ký mà máy chủ S3/MinIO tính toán lại dựa trên request thực tế nhận được. Nguyên nhân phổ biến nhất là:  
  **Sự không khớp về Header (Header Mismatch):** Khi Backend tạo chữ ký, danh sách `SignedHeaders` chỉ khai báo header `host`. Tuy nhiên, khi trình duyệt của Client gửi lệnh `PUT` bằng thư viện `axios` hoặc `fetch`, mã Frontend lại tự ý chèn thêm các header như `Content-Type: image/png` hoặc các header tùy biến khác mà không có trong chữ ký ban đầu.  
  Để phòng tránh, chúng ta có 2 nguyên tắc: Hoặc là Client chỉ gửi đúng những header đã được Backend đưa vào danh sách `SignedHeaders`, hoặc Backend khi sinh URL phải nhận trước thông tin `Content-Type` của file từ Client để đưa chính xác vào quá trình chuẩn hóa Canonical Headers ngay từ đầu."
