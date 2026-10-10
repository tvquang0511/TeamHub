# 02 — Frontend

## 1. Cấu trúc thư mục frontend theo nguyên tắc gì?

Frontend tách theo trách nhiệm: `features` chứa UI theo nghiệp vụ như board/workspace/auth; `api` tập trung HTTP contract; `hooks` chứa query/mutation tái sử dụng; `providers` đặt Auth, Theme và QueryClient cho toàn app; `lib` là tiện ích như socket, parse API error và toast. Cách này giúp code dễ tìm theo domain thay vì theo loại file thuần túy.

## 2. Vì sao dùng TanStack Query?

Nó quản lý **server state**: fetch, cache, loading/error state, retry và invalidation. Dữ liệu board, card, workspace không phải state UI thuần; dùng Query giúp tránh tự viết nhiều `useEffect` và đồng bộ cache sau mutation dễ hơn.

## 3. Server state khác client/UI state thế nào?

Server state là bản sao dữ liệu từ API, có thể stale và cần refetch, ví dụ board detail. UI state chỉ tồn tại cho một phiên tương tác, ví dụ modal đang mở, ô tìm kiếm hoặc trạng thái drag. Không nên nhét toàn bộ API response vào state cục bộ nếu Query đã quản lý nó.

## 4. Sau khi tạo hoặc di chuyển card, cache cập nhật/invalidate thế nào?

Mutation thành công sẽ invalidate hoặc cập nhật query liên quan; tùy thao tác có thể optimistic update để UI phản hồi ngay. Nếu API lỗi, rollback optimistic state hoặc refetch để lấy lại dữ liệu đúng từ server. Server vẫn là nguồn sự thật cuối cùng.

## 5. Realtime kết hợp với cache frontend ra sao?

Khi nhận event board/card/chat từ Socket.IO, frontend cập nhật query cache tương ứng hoặc invalidate board detail. Với event nhỏ, patch cache giúp mượt; với payload phức tạp hoặc có nguy cơ lệch state, invalidate/refetch an toàn hơn.

## 6. Vì sao dùng Axios thay vì fetch thuần?

Axios có instance dùng chung cho base URL, interceptors gắn Authorization/refresh token, parse JSON và chuẩn hóa error tiện hơn. `fetch` cũng làm được nhưng cần tự viết các phần đó. Đây là lựa chọn giảm code lặp, không phải vì fetch không đủ khả năng.

## 7. Access token hết hạn thì sao?

Request mạng luôn có thể chậm hoặc lỗi. Loading cho biết UI đang làm việc, empty state cho biết không có dữ liệu là hợp lệ, error state cho phép người dùng retry thay vì thấy trang trắng hoặc nghĩ ứng dụng hỏng.

HTTP client bắt 401, gọi refresh endpoint để đổi access token rồi retry đúng một lần request cũ. Nếu refresh thất bại thì xóa session cục bộ và điều hướng login. Cần tránh retry vô hạn và xử lý nhiều request 401 đồng thời bằng một refresh request dùng chung.

## 8. Khi API thất bại, UI hiển thị lỗi ra sao?

Lỗi được parse về message/code ổn định rồi hiển thị toast hoặc error state ngay vùng dữ liệu liên quan. Mutation giữ hoặc rollback optimistic UI, có nút retry khi phù hợp. Không hiển thị raw stack trace/backend internals cho người dùng.

## 9. Làm sao tránh kéo thả bị giật hoặc chờ API lâu?

Frontend cập nhật vị trí cục bộ theo optimistic update ngay lúc drop, sau đó gửi mutation. Nếu server thành công thì giữ state; nếu thất bại thì rollback/refetch và báo lỗi. Chỉ phát request khi thao tác drop kết thúc, không gọi API ở từng pixel kéo chuột.

## 10. Hai người cùng kéo một card thì frontend phản ứng thế nào?

Frontend coi server là nguồn sự thật. Khi nhận event realtime hoặc response mới hơn, cập nhật card theo trạng thái server; nếu mutation của mình conflict/lỗi thì refetch board và thông báo ngắn. Để chặt hơn, server có thể dùng revision/`updatedAt`; UI không tự quyết định kết quả xung đột.

## 11. Bạn xử lý loading, empty và error state thế nào?

## 12. Board có hàng nghìn card thì tối ưu render thế nào?

Không tải toàn bộ card không cần thiết: phân trang/lazy-load theo list, query chỉ lấy trường cần hiển thị và virtualize danh sách dài. Cũng cần tránh render lại mọi card khi chỉ một card thay đổi bằng state update có phạm vi hẹp và component memo hóa khi đo đạc cho thấy cần.

## 13. Dark/light mode triển khai thế nào?

`ThemeProvider` giữ theme hiện tại, thêm class hoặc data attribute lên document root và CSS variables/Tailwind classes đổi màu theo theme. Preference được lưu để lần mở sau giữ lựa chọn; có thể lấy `prefers-color-scheme` làm mặc định ban đầu.

## 14. Vì sao tách `api`, `features`, `hooks`, `providers`?

`features` gom UI theo nghiệp vụ; `api` tập trung HTTP contract; `hooks` tái sử dụng logic mutation/query; `providers` đặt context toàn app như auth, theme, QueryClient. Cách này giúp tìm code theo mục đích, nhưng không nên trừu tượng hóa thêm khi chưa có nhu cầu.

## 15. Làm sao đảm bảo dữ liệu API type-safe trong TypeScript?

Khai báo type DTO cho request/response, cho generic của Axios/React Query, và để backend validate runtime bằng Zod. TypeScript chỉ bảo vệ lúc compile; response thật từ network vẫn phải được backend tạo theo contract và frontend cần xử lý dữ liệu thiếu/lỗi. Khi dự án lớn hơn có thể sinh type từ OpenAPI thay vì duy trì type thủ công.
