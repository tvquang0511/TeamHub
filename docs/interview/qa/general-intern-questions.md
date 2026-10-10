# Q&A: Intern / Web Fundamentals (bám theo CV của bạn)

Tài liệu này ưu tiên câu hỏi kiểu “thực tập sinh sắp ra trường”: nền tảng + cách tư duy + cách bạn debug + kể về project.

---

## A. Câu hỏi mở đầu (rất hay gặp)
1) **Giới thiệu bản thân (60s)**
- Bạn là SV SE HCMUS (2023–2027), focus web backend + scalable systems.
- Bạn làm TeamHub như một project end-to-end (frontend + backend + worker + infra).
- Bạn thích dùng AI để tăng tốc nhưng vẫn hiểu và kiểm soát chất lượng.

2) **Tại sao bạn chọn vị trí intern ở công ty?**
- Nêu 1–2 lý do thật: môi trường, tech stack, hướng AI-assisted dev.

3) **Điểm mạnh / điểm cần cải thiện**
- Mạnh: tự chủ, ship end-to-end, debug có quy trình, vibe coding có kiểm soát.
- Cần cải thiện: depth một vài mảng (VD: testing sâu hơn, tracing/metrics, advanced DB tuning).

---

## B. Web fundamentals (cơ bản nhưng hay bị hỏi sâu)
1) **HTTP method và status code**
- GET/POST/PATCH/PUT/DELETE; idempotency.
- 200/201/204, 400, 401, 403, 404, 409, 429, 500.

2) **Authn vs Authz**
- Authn: bạn là ai (JWT verify).
- Authz: bạn được làm gì (workspace membership, board membership/role).

3) **CORS là gì? Khi nào cần?**
- Nếu frontend/backend khác origin.
- Nếu đi qua Nginx same-origin thì giảm nhu cầu CORS.

4) **SQL injection và cách tránh**
- Parameterized queries / ORM.

5) **Race condition / concurrency**
- Ví dụ reminder job: lock row bằng `FOR UPDATE` để tránh gửi trùng.

---

## C. Database (Postgres + Prisma)
1) **Tại sao chọn Postgres?**
- Relational data, constraints, transactions.

2) **Prisma là gì? Trade-off?**
- Developer velocity, type-safe.
- Trade-off: query control đôi khi hạn chế, cần chú ý N+1.

3) **Vì sao position dùng Decimal?**
- Dễ chèn giữa 2 item mà không reindex toàn bộ.

---

## D. Redis / Queue / Realtime (điểm mạnh của TeamHub)
1) **Redis dùng cho gì trong TeamHub?**
- Cache-aside (analytics/card detail), versioning keys.
- Rate limiting (INCR + EXPIRE) fail-open.
- BullMQ backend queues (emails/reminders/analytics/blobs) dùng Redis làm broker.

2) **BullMQ khác gì so với cron trong app?**
- Tách background workload ra worker.
- Retry/backoff, concurrency, repeatable jobs.

3) **Socket.IO auth như thế nào?**
- JWT ở handshake auth/header; join room phải verify membership.

---

## E. Debugging / troubleshooting (intern hay bị test)
1) **Bạn debug một bug “khó reproduce” thế nào?**
- Bước: reproduce → add logs → isolate → hypothesis → verify fix.
- Có thể nhắc Postman collection, Swagger UI.

2) **Khi production có lỗi Redis down?**
- Rate-limit/cache fail-open, API vẫn chạy.
- Observability: log error, degrade gracefully.

---

## F. Câu hỏi về teamwork (dù bạn làm personal project)
1) **Bạn làm việc với Git như thế nào?**
- Feature branches, small commits, PR-style review (kể cả tự review).

2) **Bạn nhận feedback / conflict ra sao?**
- Ưu tiên mục tiêu sản phẩm, minh bạch trade-off.

---

## G. Câu hỏi bám CV (project selection)
- TeamHub sẽ là project chính để hỏi sâu.
- Ecommerce “in progress”: chuẩn bị nói rõ scope đã hoàn thành, phần nào đang làm.
- BoardGameOnline: nhấn mạnh leadership, PR review, debug realtime.

---

## H. Câu hỏi ngược lại cho nhà tuyển dụng (nên chuẩn bị 3 câu)
- Team đang dùng AI trong SDLC như thế nào? Copilot, review policy, security?
- Intern sẽ làm task kiểu nào? Có mentor/review flow ra sao?
- Stack chính và kỳ vọng 1–3 tháng đầu?
