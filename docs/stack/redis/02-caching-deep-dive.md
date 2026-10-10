# 02 - Kỹ Thuật Caching & Cơ Chế Version-Stamping Chuyên Sâu

---

## 1. Bản Chất Kiến Trúc Caching Trong TeamHub

Caching không đơn thuần là lưu dữ liệu vào RAM, mà là một bài toán cân bằng giữa: **Tốc độ đọc (Performance)**, **Tính nhất quán dữ liệu (Data Consistency)** và **Tính bảo mật (Security)**.

Trong TeamHub, toàn bộ hạ tầng cache được viết tại [`backend/src/infrastructure/redis/redisCache.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/infrastructure/redis/redisCache.ts).

### 1.1 Mô hình Cache-Aside (Lazy Loading)
TeamHub áp dụng mô hình tiêu chuẩn **Cache-Aside**:

```
[ Client ] 
    │
    ▼ (1. Yêu cầu xem Board)
[ Backend API ] ──(2. GET cache)──► [ Redis ]
    │                                  │
    │◄───(3a. HIT: Trả JSON về ngay)───┤ (Sub-millisecond)
    │                                  │
    ├───(3b. MISS: Không thấy)─────────┘
    │
    ▼ (4. Query JOIN nhiều bảng)
[ PostgreSQL ]
    │
    ▼ (5. Trả dữ liệu)
[ Backend API ] ──(6. SET EX ttlSec)──► [ Redis ]
    │
    ▼ (7. Trả dữ liệu cho Client)
[ Client ]
```

### 1.2 Nguyên tắc "Fail-Open" (Không chết theo Redis)
Một nguyên tắc sống còn trong thiết kế hệ thống lớn: **Cache chỉ là tầng tối ưu hóa (Best-effort), không được trở thành Single Point of Failure (SPOF)**.

Trong `redisCache.ts`, mọi thao tác Redis đều được bọc trong `try / catch`:
```typescript
export async function cacheGetString(key: string): Promise<string | null> {
  if (!env.CACHE_ENABLED) return null;
  try {
    const v = await getRedis().get(key);
    return v;
  } catch {
    // Nếu Redis sập, timeout hoặc mạng chập chờn:
    // Trả về null xem như MISS -> Backend tự query PostgreSQL tiếp
    return null; 
  }
}
```
👉 *Hệ quả tích cực:* Nếu Redis bị sập đột ngột trên Production, ứng dụng chỉ chạy chậm hơn đôi chút vì phải query trực tiếp DB, nhưng **khách hàng vẫn sử dụng được bình thường, API không báo lỗi 500!**

### 1.3 Xóa bộ nhớ đệm bất đồng bộ với `UNLINK`
Khi cần xóa 1 key trong Redis:
* Lệnh `DEL` truyền thống là **Blocking**: Nếu key chứa 1 object JSON dung lượng lớn, Redis sẽ dừng toàn bộ event loop để giải phóng RAM của key đó trước khi nhận request tiếp theo.
* TeamHub sử dụng lệnh `UNLINK`:
```typescript
export async function cacheDel(key: string): Promise<void> {
  if (!env.CACHE_ENABLED) return;
  try {
    // UNLINK tách key ra khỏi keyspace ngay lập tức (O(1)) 
    // và thu hồi bộ nhớ ngầm ở background thread
    await (getRedis() as any).unlink(key);
  } catch {
    await getRedis().del(key); // Fallback nếu phiên bản Redis cũ
  }
}
```

---

## 2. Vấn Đề Nan Giải: Cache Invalidation & Giải Pháp "Version-Stamping"

> *"There are only two hard things in Computer Science: cache invalidation and naming things."* — Phil Karlton

### 2.1 Cơn ác mộng của việc xóa Cache theo kiểu truyền thống
Giả sử bạn xem một Kanban Board gồm: 1 bảng, 5 cột (Lists), 50 thẻ (Cards), 10 người tham gia (Members), 20 nhãn (Labels).
Khi có một hành động nhỏ: User kéo một Card từ cột A sang cột B, bạn phải làm gì với cache?
* **Cách ngây thơ 1:** Dùng `SCAN` hoặc `KEYS cache:v1:board:123:*` rồi xóa.
  ❌ *Hậu quả:* Quét pattern trên Redis làm đứng luồng xử lý (Blocking), gây nghẽn toàn bộ server khi số lượng key lớn.
* **Cách ngây thơ 2:** Tự viết logic tìm và sửa lại đúng mảng JSON trong Redis.
  ❌ *Hậu quả:* Cực kỳ phức tạp, dễ sinh ra bug bất đồng bộ dữ liệu giữa DB và Cache.

### 2.2 Giải pháp đột phá của TeamHub: Version-Stamping (Bump Version)
Thay vì tìm cách xóa dữ liệu cache, TeamHub quản lý một con số **Version** độc lập cho mỗi Board:

```
Version Key : `cache:v1:board:{boardId}:ver`            ──► Giá trị: 1 (số nguyên)
Data Key    : `cache:v1:board:{boardId}:detail:ver:1`   ──► Giá trị: Toàn bộ JSON Board
```

#### Quy trình hoạt động:

```
[ THAO TÁC GHI (MUTATION) ]
User di chuyển thẻ / sửa tên / đổi màu nhãn
         │
         ▼
1. Lưu cập nhật vào PostgreSQL (Source of Truth)
2. Gọi hàm: bumpBoardCacheVersion(boardId)
   └─► Redis thực thi: INCR cache:v1:board:{boardId}:ver
       (Giá trị version tăng từ 1 -> 2 trong O(1))

───────────────────────────────────────────────────────

[ THAO TÁC ĐỌC TIẾP THEO (READ) ]
User khác mở hoặc tải lại Board
         │
         ▼
1. Đọc Version hiện tại: GET cache:v1:board:{boardId}:ver ──► Nhận được: 2
2. Tìm kiếm Data Key: `cache:v1:board:{boardId}:detail:ver:2`
3. Vì key version 2 chưa có trong Redis ──► CACHE MISS!
4. Query dữ liệu mới nhất từ PostgreSQL ──► Lưu vào `...detail:ver:2` với TTL 120s
```

#### Ưu điểm vượt trội:
1. **Tốc độ cực nhanh $O(1)$:** Hàm `bumpBoardCacheVersion` chỉ gọi duy nhất 1 lệnh `INCR`.
2. **Không cần dọn dẹp rác thủ công:** Key cũ `...detail:ver:1` vẫn còn đó nhưng không ai đọc tới nữa, và sẽ **tự động biến mất sau 120 giây** nhờ cơ chế `TTL`.
3. **Tuyệt đối an toàn:** Không bao giờ xảy ra tình trạng đọc phải dữ liệu cũ (Stale Read).

---

## 3. Negative Caching (Chống Tấn Công Dò Quét DB)

### Bài toán:
Nếu hacker liên tục gửi hàng nghìn request kiểm tra quyền của những User không có thật hoặc không thuộc Workspace:
* Bình thường: Cache miss liên tục $\rightarrow$ Mọi request đều đâm thẳng xuống PostgreSQL $\rightarrow$ DB cạn kiệt Connection Pool và treo máy.

### Cách TeamHub giải quyết:
TeamHub định nghĩa một chuỗi Sentinel đặc biệt:
```typescript
const NONE_SENTINEL = "__none__";
```
Tại [`boards.repo.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/boards/boards.repo.ts#L22-L35):
```typescript
async isWorkspaceMember(workspaceId: string, userId: string) {
  const cacheKeyStr = cacheKey("member", "workspace", workspaceId, "user", userId);

  // 1. Kiểm tra cache (có phân biệt null do miss hay null do không có quyền)
  const cached = await cacheGetJsonNullable<{ id: string; role: MemberRole }>(cacheKeyStr);
  if (cached.hit) return cached.value; // Nếu cached là null -> trả về null ngay, KHÔNG query DB!

  // 2. Query DB nếu thực sự miss
  const membership = await prisma.workspace_members.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { id: true, role: true },
  });

  // 3. Nếu membership = null, hàm cacheSetJson sẽ lưu chuỗi "__none__" vào Redis với TTL 60s
  await cacheSetJson(cacheKeyStr, membership, env.CACHE_MEMBERSHIP_TTL_SEC);
  return membership;
}
```
👉 *Kết quả:* Lần request thứ hai từ kẻ tấn công sẽ trúng Cache Hit với giá trị `null` và bị từ chối ngay lập tức ở tầng Redis trong 0.2ms!

---

## 4. Phân Tích Thực Tế Từng Thành Phần Cache

### 4.1 Board Detail View Cache ([`boards.service.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/boards/boards.service.ts#L250-L290))
Đây là màn hình nặng nhất của hệ thống vì cần tải toàn bộ cấu trúc Kanban.

**Điểm thiết kế bảo mật xuất sắc:**
* Một Board được xem bởi nhiều User khác nhau (Admin, Member, Viewer, Owner).
* Quyền hạn thao tác của mỗi người (`actor`) là khác nhau.
* **Quy tắc vàng:** **CHỈ CACHE DỮ LIỆU CHUNG, TUYỆT ĐỐI KHÔNG CACHE QUYỀN HẠN CỦA ACTOR TRONG CÙNG KEY!**

Code triển khai trong dự án:
```typescript
// 1. Lấy dữ liệu chung từ Cache (Lists, Cards, Members, Labels)
const boardVer = await getBoardCacheVersion(boardId);
const cacheKeyStr = cacheKey("board", boardId, "detail", "ver", String(boardVer));
const cached = await cacheGetJson<BoardDetailPayload>(cacheKeyStr);

// 2. TÍNH TOÁN QUYỀN RIÊNG BIỆT CHO USER ĐANG GỌI API (Không nằm trong cache chung)
const actor = this.buildBoardActorPermissions({
  workspaceRole: wsMembership.role,
  boardVisibility: board.visibility,
  boardMemberRole: boardMember?.role,
});

if (cached) {
  // Trả về dữ liệu chung từ Redis + ghép quyền của user này vào
  return { ...cached, actor };
}

// 3. Nếu Cache Miss: Query DB, lưu vào Redis và trả về kết quả
```
> ⚠️ **Nếu bạn cache cả `actor` vào chung 1 key:** User A (Admin) mở board trước $\rightarrow$ Cache lưu quyền Admin. User B (Viewer) mở board sau $\rightarrow$ Nhận được payload kèm quyền Admin của User A! Lỗ hổng Privilege Escalation cực kỳ nghiêm trọng. TeamHub đã xử lý hoàn hảo việc này.

### 4.2 Membership Cache ([`boards.repo.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/boards/boards.repo.ts))
* **Mục đích:** Hầu như mọi API route của Board/Card đều phải kiểm tra: "User này có thuộc Board/Workspace này không?".
* **Giải pháp:** Cache kết quả `isWorkspaceMember` và `isBoardMember` với TTL 60 giây.
* **Invalidation:** Khi thêm/xóa thành viên hoặc đổi role (`addBoardMember`, `removeBoardMember`), hàm gọi `cacheDel` xóa đúng key của user đó.

### 4.3 Analytics Response Cache ([`analytics.service.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/analytics/analytics.service.ts))
* Các báo cáo biểu đồ (Velocity, Thống kê thẻ hoàn thành theo ngày) đòi hỏi các câu lệnh SQL gom nhóm `GROUP BY` và tính toán rất nặng.
* Key cache: `cache:v1:analytics:board:{boardId}:from:{from}:to:{to}:ver:{analyticsVer}`
* TTL: **600 giây (10 phút)**.
* Invalidation: Khi có tiến trình tổng hợp số liệu ban đêm (Daily rollup job), worker sẽ gọi `bumpAnalyticsCacheVersion(boardId)`.

---

## 🎯 Tổng Kết Bài Học 02 & Góc Nhìn Phỏng Vấn

### Câu hỏi phỏng vấn thường gặp:
1. **"Làm thế nào bạn giải quyết bài toán Cache Invalidation trong đồ án của mình?"**
   * *Trả lời:* "Thay vì quét pattern `KEYS` hoặc `DEL` hàng loạt gây nghẽn Redis, em sử dụng kỹ thuật **Version-Stamping**. Em lưu một số nguyên version cho mỗi Board. Mỗi khi có thao tác ghi làm thay đổi cấu trúc bảng, em chỉ cần tăng số version này lên 1 đơn vị bằng lệnh atomic `INCR`. Các request tiếp theo sẽ tự động đọc theo version mới và nạp cache mới, còn dữ liệu cũ sẽ tự tiêu hủy theo TTL."

2. **"Nếu Redis gặp sự cố thì hệ thống của bạn xử lý ra sao?"**
   * *Trả lời:* "Hệ thống áp dụng cơ chế **Fail-Open**. Tầng cache được thiết kế dưới dạng Best-Effort và bọc `try/catch`. Khi Redis gặp lỗi, hàm cache trả về `null` tương đương một Cache Miss, và hệ thống tự động fallback truy vấn trực tiếp từ PostgreSQL, giúp API không bị crash."

👉 *Bước tiếp theo: Mời bạn mở file [`03-bullmq-job-queues.md`](./03-bullmq-job-queues.md) để tìm hiểu cách Redis được dùng làm Message Broker cho hàng đợi công việc nền với BullMQ.*
