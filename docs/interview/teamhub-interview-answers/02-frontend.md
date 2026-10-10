# 02 — Frontend

## Vì sao dùng TanStack Query?

Nó quản lý **server state**: fetch, cache, loading/error state, retry và invalidation. Dữ liệu board, card, workspace không phải state UI thuần; dùng Query giúp tránh tự viết nhiều `useEffect` và đồng bộ cache sau mutation dễ hơn.

## Server state khác UI state thế nào?

Server state là bản sao dữ liệu từ API, có thể stale và cần refetch, ví dụ board detail. UI state chỉ tồn tại cho một phiên tương tác, ví dụ modal đang mở, ô tìm kiếm hoặc trạng thái drag. Không nên nhét toàn bộ API response vào state cục bộ nếu Query đã quản lý nó.

## Sau mutation, UI cập nhật thế nào?

Mutation thành công sẽ invalidate hoặc cập nhật query liên quan; tùy thao tác có thể optimistic update để UI phản hồi ngay. Nếu API lỗi, rollback optimistic state hoặc refetch để lấy lại dữ liệu đúng từ server. Server vẫn là nguồn sự thật cuối cùng.

## Realtime kết hợp với cache frontend ra sao?

Khi nhận event board/card/chat từ Socket.IO, frontend cập nhật query cache tương ứng hoặc invalidate board detail. Với event nhỏ, patch cache giúp mượt; với payload phức tạp hoặc có nguy cơ lệch state, invalidate/refetch an toàn hơn.

## Vì sao cần loading, empty và error state?

Request mạng luôn có thể chậm hoặc lỗi. Loading cho biết UI đang làm việc, empty state cho biết không có dữ liệu là hợp lệ, error state cho phép người dùng retry thay vì thấy trang trắng hoặc nghĩ ứng dụng hỏng.

## Access token hết hạn thì sao?

HTTP client cần bắt lỗi 401, dùng refresh token để đổi access token rồi retry một lần request cũ. Nếu refresh thất bại thì xóa phiên cục bộ và đưa user về login. Không retry vô hạn vì có thể tạo vòng lặp request.

## Nếu board có rất nhiều card, tối ưu gì?

Không tải toàn bộ card không cần thiết: phân trang/lazy-load theo list, query chỉ lấy trường cần hiển thị và virtualize danh sách dài. Cũng cần tránh render lại mọi card khi chỉ một card thay đổi bằng state update có phạm vi hẹp và component memo hóa khi đo đạc cho thấy cần.

## Vì sao tách `features`, `api`, `hooks`, `providers`?

`features` gom UI theo nghiệp vụ; `api` tập trung HTTP contract; `hooks` tái sử dụng logic mutation/query; `providers` đặt context toàn app như auth, theme, QueryClient. Cách này giúp tìm code theo mục đích, nhưng không nên trừu tượng hóa thêm khi chưa có nhu cầu.
