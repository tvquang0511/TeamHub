# Q&A: AI + Vibe Coding (theo JD Alliance)

Bạn đang ứng tuyển intern, nhưng JD nhấn mạnh: **AI có thể code/test giỏi — bạn phải hiểu mục tiêu, hiểu code, và kiểm soát chất lượng**.

Ngoài phần “AI khi code”, công ty outsource thường quan tâm bạn có thể dùng AI xuyên SDLC:
**phân tích → lên kế hoạch → lập trình → kiểm thử → triển khai → bảo trì**.

---

## 1) “Bạn dùng AI như thế nào khi làm project?”
**Ý chính cần nói (không quá dài):**
- AI là **pair programmer** để tăng tốc: brainstorm giải pháp, generate skeleton, gợi ý edge cases, viết doc/test draft.
- Bạn luôn **review như PR**: đọc lại logic, invariants, security, performance, naming, error handling.
- Bạn có quy trình: *prompt → tạo patch nhỏ → chạy/verify → iterate* (không dump 1 lần cả dự án).

**Cách trả lời mẫu (30–45s):**
> Em dùng AI theo kiểu “proposal + review”. Em mô tả mục tiêu và constraints, nhờ AI đề xuất thiết kế + API shape, sau đó em tự kiểm tra lại luồng dữ liệu, authz, lỗi/edge case. Em thường yêu cầu AI tạo diff nhỏ, chạy Postman/Swagger để verify. Khi AI viết unit test, em vẫn đọc test để chắc nó đang test đúng behavior chứ không phải test implementation.

---

## 2) “Nếu AI viết code rất tốt thì bạn còn làm gì?”
**Điểm nhà tuyển dụng muốn nghe:** bạn làm phần **tư duy** và **đảm bảo đúng/safe**.
- Chốt mục tiêu & scope (đúng vấn đề, đúng ưu tiên).
- Định nghĩa contract: API, schema, error shape.
- Đọc hiểu + refactor + simplify.
- Debug (log, reproduce, isolate, root cause).
- Security: auth/authz, injection, rate limit, secrets.
- Quan sát vận hành: metrics/logs, rollback, data migration.

**Ví dụ bám TeamHub:**
- Rate limiting fail-open (Redis down không làm sập API).
- Socket.IO auth dùng JWT, join room phải kiểm tra board membership.
- Presigned URL: kiểm soát content-type, objectKey hợp lệ.

---

## 3) “Vibe coding là gì? Bạn vibe coding ra sao?”
**Định nghĩa dễ hiểu:**
- Vibe coding = dùng AI để *rapidly iterate* từ ý tưởng → chạy được → refine; nhưng bạn vẫn làm owner về design + correctness.

**Bạn có thể nói theo format 5 bước:**
1. Viết user story + acceptance criteria (đầu ra phải đo được).
2. Nhờ AI đề xuất kiến trúc + API + data model.
3. Generate code theo từng lát mỏng (thin slice) + commit nhỏ.
4. Verify bằng Postman/Swagger + chạy UI + debug.
5. Refactor + harden: authz, validation, caching/rate-limit, background jobs.

**Câu follow-up hay gặp:**
- “Bạn tránh AI hallucination bằng cách nào?”
  - Bạn yêu cầu AI chỉ thay đổi khu vực cụ thể, đọc code hiện có, và bạn tự chạy/verify.

---

## 4) “Bạn kiểm tra chất lượng output AI như thế nào?”
Checklist ngắn (nói nhanh):
- **Correctness**: luồng chính + edge cases.
- **Security**: auth/authz, input validation (Zod), không leak info.
- **Performance**: query N+1, caching TTL, queue thay vì sync.
- **Maintainability**: module boundaries, naming, error shape.
- **Observability**: log đủ để debug, error handler rõ.

---

## 5) “AI viết unit test đầy đủ, bạn có tin không?”
Cách trả lời tốt:
- Tin **một phần**: test có thể đầy đủ về mặt số lượng nhưng sai về mặt mục tiêu.
- Bạn đọc test để đảm bảo:
  - test đúng behavior,
  - có case lỗi (401/403/404/409/429),
  - không phụ thuộc thời gian/ngẫu nhiên,
  - không test implementation detail.

**Câu hỏi phụ nên luyện:**
1. Làm sao bạn biết một test AI viết ra đang test đúng requirement chứ không test code?
2. Nếu AI tạo quá nhiều mock, bạn đánh giá thế nào?
3. Bạn ưu tiên test case nào trước: happy path hay edge case?
4. Khi nào bạn sẽ bỏ qua test do AI đề xuất?
5. Bạn có thể kể một case AI viết test “đẹp” nhưng vô dụng không?
6. Nếu test AI viết ra pass nhưng bug vẫn xảy ra, bạn xử lý thế nào?
7. Bạn kiểm tra coverage thế nào để không bị “ảo tưởng” là đủ test?
8. Bạn có viết contract test / integration test thay vì chỉ unit test không?

**Câu hỏi ngắn + trả lời ngắn:**
- Q: AI viết test đầy đủ thì có cần đọc lại không? A: Có, vì test đủ số lượng chưa chắc đúng behavior.
- Q: Bạn ưu tiên loại test nào? A: Tôi ưu tiên test theo risk, nhất là auth, permission và edge case.
- Q: Khi nào không tin test AI viết? A: Khi test chỉ kiểm tra implementation detail hoặc mock quá nhiều.

---

## 6) “Bạn có ví dụ cụ thể AI giúp bạn ở TeamHub?”
Gợi ý chọn 2–3 ví dụ cụ thể, dễ kể:
- **Drag & drop**: AI giúp phác thảo thuật toán “prev/next” khi drop; bạn tự verify bằng cách kéo nhiều lần, refresh, so sánh với server order.
- **Presigned URL (SigV4)**: AI giúp nhắc lại canonical request + signed query; bạn tự test PUT/GET thực tế qua Nginx (single-origin).
- **BullMQ repeatable jobs**: AI gợi ý pattern ensure-job + cleanup legacy schedule; bạn tự kiểm tra repeatables trong Redis.

**Câu hỏi phụ nên luyện:**
1. Trong TeamHub, phần nào bạn dùng AI nhiều nhất và vì sao?
2. Bạn có ví dụ nào AI hỗ trợ tốt ở phần backend, không chỉ frontend không?
3. Có lúc nào AI gợi ý sai và bạn phải sửa lại hoàn toàn không?
4. Làm sao bạn biến gợi ý của AI thành code theo chuẩn của project?
5. Bạn verify output AI bằng công cụ nào: test, Postman, UI, log?
6. Nếu AI đề xuất thuật toán đúng nhưng quá phức tạp, bạn chọn cách nào?
7. Bạn kể sao để nhà tuyển dụng thấy bạn thực sự hiểu phần bạn làm, không chỉ “copy AI”?
8. Trong các feature của TeamHub, phần nào là ví dụ tốt nhất về “AI hỗ trợ nhưng bạn vẫn owner”? 

**Câu hỏi ngắn + trả lời ngắn:**
- Q: AI giúp bạn gì trong TeamHub? A: AI giúp em phác thảo ý tưởng, còn em tự verify bằng code và test thực tế.
- Q: Vì sao ví dụ TeamHub quan trọng? A: Vì nó chứng minh em hiểu project thật, không chỉ nói lý thuyết.
- Q: Khi AI gợi ý sai thì sao? A: Em sửa theo codebase và tài liệu chính thức, không giữ nguyên máy móc.

---

## 7) “Khi AI propose một giải pháp nhưng bạn không hiểu, bạn làm gì?”
Trả lời thẳng:
- Bạn yêu cầu AI giải thích theo invariants / input-output / failure modes.
- Bạn đọc code gốc + docs chính thức.
- Bạn viết test nhỏ hoặc script reproduce.
- Nếu vẫn mơ hồ: chọn phương án đơn giản hơn.

**Câu hỏi phụ nên luyện:**
1. Làm sao bạn phát hiện AI đang “nói nghe hợp lý” nhưng thực ra sai?
2. Khi nào bạn tin docs chính thức hơn AI, và khi nào thì ngược lại?
3. Nếu mentor hỏi lại “em giải thích đoạn này xem”, bạn sẽ trả lời thế nào?
4. Bạn có thói quen ghi lại assumption nào khi dùng AI không?
5. Nếu AI đưa ra nhiều phương án, bạn chọn dựa trên tiêu chí gì?
6. Bạn xử lý thế nào khi AI dùng thuật ngữ mà bạn chưa biết?
7. Có nên ship một giải pháp mình chưa hiểu hết nhưng test pass không? Vì sao?
8. Nếu bạn phải fix bug của code do AI tạo ra, bạn bắt đầu từ đâu?

**Câu hỏi ngắn + trả lời ngắn:**
- Q: Không hiểu code AI viết thì làm gì? A: Em yêu cầu AI giải thích lại, rồi đối chiếu với docs và code gốc.
- Q: Có nên ship khi chưa hiểu hết không? A: Không nên, vì em phải chịu trách nhiệm về correctness và maintainability.
- Q: Nếu AI đưa nhiều phương án thì chọn sao? A: Em chọn phương án đơn giản, an toàn và phù hợp codebase hơn.

---

## 8) “Bạn muốn phát triển theo hướng nào ở công ty?”
Nên bám đúng JD:
- Muốn làm dev biết dùng AI để tăng tốc.
- Nhưng vẫn muốn build nền tảng: backend/web fundamentals, system design cơ bản.
- Sẵn sàng học thêm mobile nếu công ty cần, nhưng strength hiện tại là web.

**Câu hỏi phụ nên luyện:**
1. Bạn muốn trở thành một dev giỏi AI tooling hay một dev giỏi fundamentals trước?
2. Nếu công ty yêu cầu làm nhiều task ngoài thế mạnh, bạn thích nghi thế nào?
3. Bạn đang muốn học sâu phần nào nhất trong 6 tháng tới?
4. Vì sao bạn nghĩ AI không làm mất vai trò của dev junior?
5. Bạn kỳ vọng mentor hỗ trợ bạn như thế nào?
6. Bạn muốn tham gia vào design hay chủ yếu implementation?
7. Bạn có mục tiêu gì về quality code, tốc độ, hay ownership?
8. Nếu công ty chuyển sang project mobile, bạn sẽ bắt đầu ra sao?

**Câu hỏi ngắn + trả lời ngắn:**
- Q: Bạn muốn phát triển theo hướng nào? A: Em muốn giỏi fundamentals trước, rồi dùng AI để tăng tốc làm việc.
- Q: Vì sao phù hợp vị trí intern? A: Vì em sẵn sàng học, làm từ việc nhỏ và cải thiện chất lượng từng bước.
- Q: Nếu phải học thêm mobile thì sao? A: Em vẫn sẵn sàng, nhưng em muốn phát huy thế mạnh web trước.

---

# AI trong SDLC (Outsource): Q&A hay gặp

## 9) “Bạn dùng AI xuyên SDLC như thế nào? (end-to-end workflow)”
**Cách trả lời tốt (khung 30–60s):**
> Em dùng AI như một trợ lý để tăng tốc ở mọi bước: tóm tắt yêu cầu → biến thành user stories/acceptance criteria → plan task/estimate → generate code theo patch nhỏ → tạo test cases + test draft → hỗ trợ viết docs/runbook. Nhưng em luôn giữ nguyên tắc: AI chỉ đề xuất, còn em chịu trách nhiệm correctness, security, và chất lượng; mọi output đều được verify bằng review + chạy test + kiểm tra edge cases.

**Key phrases nên có:**
- “AI accelerates, human owns.”
- “Small diffs + verify + iterate.”
- “Traceability: output bám input.”

**Câu hỏi phụ nên luyện:**
1. Ở bước nào trong SDLC bạn tin AI nhất, và bước nào bạn tin ít nhất?
2. Bạn làm sao để AI không làm bạn bỏ qua requirement quan trọng?
3. Khi project gấp, bạn dùng AI để tăng tốc nhưng không làm giảm chất lượng như thế nào?
4. Bạn có quy trình nào để chuyển yêu cầu mơ hồ thành task rõ ràng bằng AI không?
5. Nếu chỉ được dùng AI ở 2 bước trong SDLC, bạn chọn bước nào?
6. Khi nào bạn chủ động không dùng AI dù có thể dùng?
7. Làm sao bạn chứng minh cho interviewer rằng bạn vẫn là người hiểu toàn bộ flow?
8. Nếu client đổi yêu cầu giữa chừng, AI giúp bạn update plan ra sao?

**Câu hỏi ngắn + trả lời ngắn:**
- Q: Bạn dùng AI ở bước nào nhiều nhất? A: Em dùng nhiều ở phân tích, coding và test draft.
- Q: Bước nào bạn tin AI ít nhất? A: Em tin ít nhất ở phần chốt yêu cầu và quyết định cuối cùng.
- Q: AI trong SDLC giúp gì nhất? A: Giúp em tăng tốc, còn em giữ quyền kiểm soát chất lượng.

---

## 10) (Phân tích) “Bạn dùng AI để phân tích yêu cầu từ client như thế nào?”
Bạn có thể nói theo 4 bước:
1) **Tóm tắt** meeting notes/email thành scope ngắn (goals/non-goals).
2) **Bóc tách** thành user stories + acceptance criteria (Given/When/Then).
3) **Liệt kê câu hỏi làm rõ** (ambiguities) + assumptions.
4) **Risk scan** (security, performance, timeline, dependencies).

**Câu trả lời mẫu:**
> Em có thể feed yêu cầu ở dạng đã redacted vào AI để nó giúp em viết lại thành user stories và acceptance criteria, đồng thời đề xuất các câu hỏi làm rõ. Sau đó em review lại với BA/PM/client để chốt, vì em không tin AI có thể tự suy ra yêu cầu đúng nếu input còn mơ hồ.

**Câu hỏi phụ nên luyện:**
1. Nếu requirement chỉ có 3 dòng mô tả, bạn sẽ làm rõ bằng cách nào?
2. Làm sao AI giúp bạn tách đâu là goal, đâu là non-goal?
3. Bạn có cách nào phát hiện requirement thiếu edge case không?
4. Nếu client nói một câu nhưng bạn hiểu thành hai cách khác nhau, bạn xử lý sao?
5. Bạn có biến meeting notes thành ticket/task được không, và AI giúp phần nào?
6. Bạn ưu tiên hỏi làm rõ theo business, technical hay UX trước?
7. Khi nào nên đề xuất POC/thin slice thay vì cố hiểu hết ngay?
8. Làm sao để không quá phụ thuộc AI khi đọc requirement?

**Câu hỏi ngắn + trả lời ngắn:**
- Q: Requirement mơ hồ thì làm gì? A: Em hỏi làm rõ, tách goal, non-goal và acceptance criteria trước.
- Q: AI giúp gì ở bước phân tích? A: AI giúp em tóm tắt và gợi ý câu hỏi làm rõ.
- Q: Khi nào cần POC? A: Khi requirement chưa rõ nhưng cần xác nhận hướng đi nhanh.

---

## 11) (Phân tích) “Làm sao tránh AI ‘bịa’ khi phân tích?”
Checklist ngắn:
- Chỉ đưa **nguồn thật** (notes/ticket/spec) vào prompt.
- Bắt AI **quote lại** câu nào đến từ nguồn, câu nào là “assumption”.
- Yêu cầu AI output theo format: `Known / Unknown / Assumptions / Questions`.
- Không chốt requirement bằng AI: luôn confirm với PM/client.

**Câu hỏi phụ nên luyện:**
1. Bạn làm gì nếu AI trả lời rất tự tin nhưng không có nguồn rõ ràng?
2. Có cách nào buộc AI nói rõ đâu là giả định không?
3. Bạn phân biệt thế nào giữa hypothesis và fact trong output AI?
4. Nếu spec mâu thuẫn nhau, AI có giúp phát hiện không?
5. Bạn có thói quen cross-check AI với source of truth nào?
6. Khi nào bạn nên dừng không hỏi AI nữa mà đi hỏi người thật?
7. Nếu AI trộn lẫn business rule và technical suggestion, bạn tách ra sao?
8. Làm sao bạn tránh việc AI làm sai nghĩa của một thuật ngữ domain?

**Câu hỏi ngắn + trả lời ngắn:**
- Q: Làm sao tránh AI bịa? A: Em chỉ dùng source thật và bắt AI ghi rõ assumption.
- Q: Khi nào phải hỏi người thật? A: Khi output AI không có nguồn rõ hoặc mâu thuẫn spec.
- Q: Bạn kiểm tra output thế nào? A: Em cross-check với ticket, docs và stakeholder.

---

## 12) (Kế hoạch) “Bạn dùng AI để lên kế hoạch & estimate như thế nào?”
**Điểm cần nói:** AI giúp “decompose” nhưng estimate vẫn là trách nhiệm dev/team.

Bạn có thể trả lời:
- Nhờ AI đề xuất WBS: phân rã feature thành tasks + dependencies.
- Nhờ AI gợi ý test plan, rollout plan, rollback plan.
- Estimate dựa trên kinh nghiệm + risk buffer + unknowns, không copy từ AI.

**Câu trả lời mẫu:**
> Em dùng AI để chia nhỏ công việc và nhắc các dependencies (DB migration, API contract, UI states, background jobs). Nhưng estimate em vẫn tự làm và review với mentor/team, vì AI không biết velocity và constraints thực tế của project.

**Câu hỏi phụ nên luyện:**
1. Bạn dùng AI để chia task theo kỹ thuật hay theo milestone trước?
2. Nếu AI estimate quá lạc quan, bạn sẽ điều chỉnh như thế nào?
3. Làm sao bạn phát hiện dependency bị bỏ sót trong plan?
4. Bạn có dùng AI để lập risk list không?
5. Khi nào bạn tách task nhỏ hơn thay vì để AI xử lý một lần?
6. Bạn tính buffer thời gian cho unknowns ra sao?
7. Nếu mentor hỏi vì sao estimate của bạn là 3 ngày chứ không phải 1 ngày, bạn trả lời gì?
8. Bạn có dùng AI để tạo checklist trước khi code không?

**Câu hỏi ngắn + trả lời ngắn:**
- Q: AI có giúp estimate không? A: Có, nhưng em chỉ dùng để chia nhỏ việc, còn estimate em tự chốt.
- Q: Nếu AI estimate quá nhanh thì sao? A: Em thêm buffer vì AI không biết velocity thực tế của team.
- Q: AI giúp gì cho planning? A: Giúp em nhìn ra dependency và chuẩn bị checklist tốt hơn.

---

## 13) (Kế hoạch) “Bạn kiểm soát scope trong outsource khi requirement hay đổi?”
Trả lời theo hướng “professional”:
- Luôn có **Definition of Done** và acceptance criteria.
- Change request phải có: impact analysis (time/cost/risk).
- Ưu tiên deliver theo milestone (thin slice) để client feedback sớm.

Bạn có thể nhắc AI hỗ trợ:
- AI giúp viết impact analysis draft, nhưng bạn verify.

---

## 14) (Coding) “Bạn dùng AI để code như thế nào để an toàn?”
Checklist “PR mindset”:
- Prompt có constraints: stack, style, error shape, security rules.
- Yêu cầu AI tạo **diff nhỏ** (1 chức năng/lần).
- Bạn review: authZ, input validation, error handling, data leaks.
- Chạy lint/typecheck/tests + test thủ công bằng Postman/UI.

**Điểm outsource hay hỏi:** “AI code nhanh nhưng maintainable không?”
- Bạn trả lời: ưu tiên consistency với codebase, không copy-paste vô tội vạ.

---

## 15) (Coding) “Bạn làm gì khi AI generate code mà bạn không hiểu?”
Trả lời theo quy trình:
1) yêu cầu AI giải thích theo `input → output → invariants → failure modes`.
2) đọc code gốc + docs chính thức.
3) viết test nhỏ/repro script.
4) nếu vẫn mơ hồ: chọn phương án đơn giản hơn.

---

## 16) (Coding) “Bạn tránh rủi ro bản quyền/IP khi dùng AI thế nào?”
Bạn nên trả lời thận trọng:
- Không paste nguyên code client nếu policy không cho phép.
- Ưu tiên AI để tạo *template/skeleton*, sau đó tự viết phần lõi.
- Review output để tránh “copied-looking code” và giữ consistency nội bộ.
- Tuân thủ policy của công ty về tool/model được phép.

---

## 17) (Testing) “AI giúp bạn viết test như thế nào?”
Nên chia test theo tầng:
- Unit: validate pure functions, edge cases.
- Integration: API + DB (Prisma/Postgres).
- Contract/API: status codes + error shape (401/403/404/409/429).
- E2E (nếu có): luồng login → board → move card.

AI phù hợp để:
- liệt kê test cases theo acceptance criteria
- tạo test skeleton
- gợi ý edge cases (timezone, concurrency, retries)

Bạn vẫn phải:
- review để đảm bảo test đúng behavior
- tránh test implementation detail

---

## 18) (Testing) “AI generate test coverage cao, bạn tin không?”
Trả lời chuẩn:
- Coverage cao không đồng nghĩa đúng.
- Em đọc test để đảm bảo test **đúng mục tiêu** và có **negative cases**.
- Em ưu tiên test theo risk: auth/authz, money/permission, data consistency.

---

## 19) (Testing) “Nếu AI viết test nhưng flaky (lúc pass lúc fail)?”
Bạn nói theo hướng thực chiến:
- Fix nguồn flaky: time, randomness, async races.
- Mock clock/timers, seed dữ liệu, tránh phụ thuộc network.
- Với DB: chạy trong transaction hoặc reset state rõ ràng.

---

## 20) (Deploy) “Bạn dùng AI cho deploy/infra như thế nào?”
AI có thể giúp:
- draft Dockerfile, docker-compose, Nginx reverse proxy
- draft CI pipeline steps
- checklist env vars

Bạn phải verify:
- secrets không hardcode
- least privilege
- healthcheck/rollback plan
- cấu hình websocket + upload limits đúng

Ví dụ TeamHub:
- Nginx route `/api`, `/socket.io`, `/(teamhub|teamhub-public)/`.
- `TRUST_PROXY=true` để rate limit theo IP đúng.

---

## 21) (Maintenance) “Bạn dùng AI khi bug production/maintenance thế nào?”
Trả lời theo quy trình incident:
1) Reproduce (nếu được) + thu thập logs/metrics.
2) Narrow down: phạm vi (endpoint nào, user nào, time window nào).
3) Hypothesis + verify.
4) Fix nhỏ + thêm regression test.
5) Post-mortem: root cause + prevention.

AI giúp:
- tóm tắt log, gợi ý hypothesis
- đề xuất query kiểm tra DB

Nhưng bạn vẫn phải:
- không tin AI nếu chưa reproduce/verify

---

## 22) (Maintenance) “AI đề xuất 1 fix, làm sao bạn chắc không phá thứ khác?”
Bạn có thể nói:
- viết regression test trước (nếu có thể)
- chạy test suite + test manual flows
- rollout có canary/feature flag (nếu hệ thống hỗ trợ)
- theo dõi logs/error rate sau deploy

---

## 23) (Security) “Bạn đảm bảo an toàn dữ liệu khi dùng AI trong outsource?”
Đây là câu rất hay ra.

Bạn trả lời theo policy + kỹ thuật:
- Tuân thủ tool/model được phép (enterprise/on-prem nếu có).
- **Redact** PII/secrets trước khi đưa vào prompt.
- Không paste credentials, access tokens, connection strings.
- Không upload whole repo nếu policy không cho.
- Với log: tránh đưa raw user data; chỉ đưa stack trace + request id.

---

## 24) (Security) “Prompt injection / data exfiltration là gì? Có liên quan dev không?”
Trả lời ngắn:
- Prompt injection: input của user làm AI/agent làm sai ý định (ví dụ lộ secrets, gọi tool nguy hiểm).
- Với dev workflow: nếu dùng agent tự chạy tool/PR, cần guardrails:
  - quyền truy cập tối thiểu
  - review bắt buộc
  - sandbox
  - không cho AI tự động dùng secrets

---

## 25) (Process) “Bạn integrate AI vào code review như thế nào?”
Bạn có thể nói:
- AI có thể viết review checklist và chỉ ra smell.
- Nhưng **approval cuối** là người.
- Team có quy ước: PR nhỏ, mô tả rõ, có test, link ticket.

---

## 26) (Process) “Bạn đo hiệu quả AI trong team bằng gì?”
Trả lời như một engineer:
- Cycle time (lead time từ ticket -> merged)
- Defect rate/bug regressions
- Review time
- DORA metrics (nếu có): deploy frequency, change failure rate…

Nhấn mạnh:
- Không chỉ đo tốc độ, phải đo chất lượng.

---

## 27) (Scenario) “AI generate code có lỗ hổng authZ, bạn phát hiện và xử lý?”
Bạn kể một mini-story:
- Phát hiện: endpoint trả data không thuộc user hoặc thiếu membership check.
- Fix: đưa authZ vào service layer, thêm test 403.
- Prevention: checklist auth/authz cho mọi endpoint + review rules.

Ví dụ TeamHub dễ kể:
- Socket join room phải check board membership.

---

## 28) (Scenario) “AI đề xuất giải pháp ‘ngầu’ nhưng quá phức tạp với intern, bạn làm gì?”
Trả lời:
- ưu tiên giải pháp đơn giản, dễ maintain
- chọn option có trade-off rõ
- viết doc ngắn + quyết định (decision record)

---

## 29) (Outsource) “Bạn làm việc với QA/Tester như thế nào khi có AI?”
Bạn nói:
- AI giúp generate test cases từ acceptance criteria.
- Bạn sync với QA để chốt: happy path + negative path + boundary.
- Quy trình: bug reproduction steps rõ + logs.

---

## 30) “Bạn sẽ hỏi ngược lại công ty gì về AI workflow?”
Chuẩn bị 3–5 câu:
- Team dùng tool nào? (Copilot/ChatGPT Enterprise/internal LLM)
- Policy data: có được paste code client không? redaction guideline?
- AI dùng ở bước test/deploy ra sao? có guardrails?
- Review policy: AI-generated code có bắt buộc review đặc biệt không?
- KPI kỳ vọng cho intern trong 1–3 tháng đầu?

---

## 31) Cheat sheet (60s) — “AI across SDLC”
Bạn có thể thuộc đoạn này:
> Em dùng AI như một trợ lý xuyên SDLC: từ tóm tắt yêu cầu và viết acceptance criteria, tới phân rã task và lên test plan, rồi generate code theo patch nhỏ. Sau mỗi patch em review như PR: kiểm tra auth/authz, validation, error handling, performance, và chạy verify bằng test + Postman/UI. Khi deploy/maintain, AI giúp em phân tích log và gợi ý hypothesis nhưng em luôn reproduce và thêm regression test. Em tuân thủ policy bảo mật dữ liệu: không đưa secrets/PII lên prompt và dùng đúng tool được phép.

---

## 32) (Outsource) “Bạn update tiến độ cho client/team như thế nào để không ‘vibe coding’ mơ hồ?”
Trả lời theo format rõ ràng:
- Hôm nay: done gì (link PR/ticket)
- Đang làm: next step cụ thể
- Blockers/risks: cần ai hỗ trợ gì
- ETA: có điều kiện (nếu không có blocker)

Bạn có thể nói thêm:
- AI giúp viết draft status update, nhưng bạn đảm bảo đúng sự thật và có link chứng minh.

---

## 33) (Outsource) “Handover tài liệu khi bàn giao feature/bàn giao dự án?”
Checklist bàn giao:
- API docs (endpoint, auth, error codes)
- Env vars + cách chạy local
- Runbook: common issues + cách debug
- Migration notes + rollback steps
- Monitoring points (logs/metrics) nếu có

AI giúp:
- chuẩn hóa template docs/runbook

---

## 34) (Scenario) “Client mô tả requirement rất mơ hồ, bạn làm gì ngay?”
Bạn trả lời theo hướng chủ động:
- Viết lại requirement thành 3 phần: goal, constraints, acceptance criteria draft.
- Đưa 5–10 câu hỏi làm rõ quan trọng nhất.
- Propose demo/POC nhỏ (thin slice) để xác nhận sớm.

AI giúp:
- gợi ý câu hỏi làm rõ theo domain, nhưng bạn chọn câu hỏi quan trọng.

---

## 35) (Scenario) “AI đề xuất thêm library mới, nhưng project không cho thêm dependency?”
Trả lời:
- Tôn trọng constraint của project.
- Yêu cầu AI đưa giải pháp dùng library hiện có / native.
- Nếu bắt buộc: làm proposal (benefit/risk/size) để xin approval.

---

## 36) (Scenario) “AI code xong, test pass, nhưng behavior sai với acceptance criteria?”
Trả lời:
- Ưu tiên acceptance criteria làm ‘source of truth’.
- Viết test theo criteria (không theo code).
- Sửa logic + thêm regression test để khóa behavior đúng.

---

## 37) (Process) “Bạn viết prompt thế nào để AI output sát codebase?”
Gợi ý cách nói:
- Cho AI context tối thiểu nhưng đủ: module liên quan, error format, naming.
- Nêu rõ constraints: TypeScript strict, Prisma patterns, auth middleware, v.v.
- Yêu cầu output dạng patch/diff + giải thích trade-offs.

---

## 38) (Learning) “Bạn dùng AI để onboard codebase mới ra sao?”
Trả lời thực tế:
- Dùng AI để tóm tắt kiến trúc từ README + folder structure.
- Nhờ AI vẽ dependency map (module nào gọi module nào).
- Sau đó tự confirm bằng đọc code chính và chạy project.

---

## 39) (Quality) “Có phần nào bạn sẽ hạn chế dùng AI, vì rủi ro cao?”
Bạn có thể nói:
- Auth/authz, crypto, payment, data migrations: vẫn có thể dùng AI hỗ trợ, nhưng review/verify cực chặt.
- Bất kỳ thứ gì liên quan secrets/PII: không đưa dữ liệu thật vào prompt.

---

## 40) “Nếu mentor nói: ‘Em đang lệ thuộc AI quá’, em phản hồi sao?”
Trả lời trưởng thành:
- Thừa nhận AI chỉ là tool.
- Cam kết giải thích được code mình submit (line-by-line nếu cần).
- Chủ động học nền tảng: debugging, reading docs, tracing, viết test.
