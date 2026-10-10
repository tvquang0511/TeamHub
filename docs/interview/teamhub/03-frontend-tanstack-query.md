# TeamHub — TanStack Query (data-fetching + optimistic update)

## 1) TanStack Query là gì?
- Là thư viện quản lý **server state** cho React.
- Giúp xử lý fetching, cache, refetch, invalidation, optimistic update, retry.
- Trong TeamHub, nó là lớp trung gian giữa UI và REST API.

## 2) Vì sao TeamHub dùng TanStack Query?
- Data từ server thay đổi liên tục: workspace, board, card, member, profile.
- Muốn giảm boilerplate `useEffect + fetch + loading + error`.
- Muốn cache theo query key và invalidate đúng chỗ sau mutation.
- Muốn optimistic update để UI phản hồi ngay khi kéo thả hoặc tạo card/list.

## 3) Cấu hình chung
File: `frontend/src/app/providers/QueryProvider.tsx`

TeamHub tạo một `QueryClient` dùng default options:
- `refetchOnWindowFocus: false`
- `retry: 1`
- `staleTime: 5 minutes`

Ý nghĩa phỏng vấn:
- Không tự refetch khi đổi tab chỉ vì focus lại.
- Retry nhẹ để chịu lỗi mạng tạm thời.
- `staleTime` đủ dài để tránh gọi lại liên tục cho data không đổi quá nhanh.

## 4) Query key convention
Query key trong TeamHub có dạng rõ ràng để dễ invalidate:
- `['workspaces']`
- `['workspace', workspaceId]`
- `['workspace', workspaceId, 'boards']`
- `['workspace', workspaceId, 'members']`
- `['board', boardId, 'detail']`
- `['board', boardId]`
- `['card', cardId, 'labels']`
- `['card', cardId, 'reminders']`
- `['users', 'me']`

Nguyên tắc:
- Key phải đủ cụ thể để tránh invalidate nhầm.
- Nhưng cũng phải có hierarchy để invalidate được theo nhóm.

## 5) Use query cho server state
Ví dụ trong TeamHub:
- `WorkspaceDetailPage` load workspace, boards, members bằng `useQuery`.
- `BoardPage` load board detail bằng `useQuery`.
- `CardDetailPage` load card detail bằng `useQuery`.
- `ProfilePage` load current user bằng `useQuery`.

Điểm nên nói:
- Local UI state như mở modal, draft text, tab đang chọn vẫn để `useState`.
- Dữ liệu đã nằm trên server thì để React Query quản lý.

## 6) Invalidate queries sau mutation
Đây là pattern quan trọng nhất của TeamHub.

Ví dụ:
- Tạo workspace xong thì invalidate `['workspaces']`.
- Update board xong thì invalidate `['board', boardId, 'detail']` và `['workspace', workspaceId, 'boards']`.
- Update card xong thì invalidate board detail.

Các hook tiêu biểu:
- `frontend/src/app/hooks/useBoardMutations.ts`
- `frontend/src/app/hooks/useCardMutations.ts`
- `frontend/src/app/hooks/useListMutations.ts`
- `frontend/src/app/hooks/useWorkspaceMutations.ts`

## 7) Optimistic update
TeamHub dùng optimistic update ở các luồng mà user cần phản hồi nhanh:
- tạo list
- tạo card
- rename list
- update card title/description
- set due date
- drag & drop list/card

### 7.1 Flow chuẩn
1. `queryClient.cancelQueries(...)`
2. `queryClient.getQueryData(...)`
3. Tạm sửa cache local bằng `setQueryData(...)`
4. Gọi mutation API
5. Nếu lỗi thì rollback từ `ctx.previous`
6. Nếu success thì replace temp item bằng data thật hoặc invalidate lại

### 7.2 Ví dụ tạo list
Trong `BoardPage.tsx`:
- Tạo temp list id `temp:list:...`
- Chèn list vào cache ngay
- Khi server trả về list thật thì replace temp list
- Sau đó normalize lại position để UI ổn định

### 7.3 Ví dụ tạo card
Trong `AddCardButton.tsx`:
- Tạo temp card id `temp:card:...`
- Tính position tạm ở cuối list
- Insert vào cache ngay
- Khi success thì replace card temp bằng card thật
- Normalize lại position trong list

### 7.4 Ví dụ update card
Trong `CardItem.tsx`:
- Optimistically update title/description/dueAt trong board detail cache.
- Nếu lỗi thì restore cache cũ.

## 8) Vì sao optimistic update hợp với TeamHub?
- Drag & drop và thao tác board/list/card cần cảm giác realtime.
- Nếu chờ round-trip server mới update UI thì UX rất chậm.
- Vì board detail là một cây dữ liệu lớn, update local cache giúp UI đồng bộ nhanh.

## 9) Khi nào không optimistic?
Những luồng phức tạp hoặc cần server làm source of truth có thể chỉ invalidate/refetch.
Ví dụ:
- một số mutate chỉ cần refetch board detail sau khi thành công.
- Nếu logic server tính toán nhiều hoặc cần đảm bảo thứ tự chính xác, refetch là an toàn hơn.

## 10) Query cache vs mutation cache
- Query cache lưu data server đang xem.
- Mutation dùng để gửi thay đổi và có `onMutate/onSuccess/onError`.
- TeamHub thường dùng mutation để modify query cache sau đó invalidate.

## 11) Cách xử lý lỗi
Pattern chung:
- Lấy message từ API error nếu có.
- Nếu không có thì fallback message tiếng Việt rõ ràng.
- Rollback optimistic state khi mutation fail.

Ví dụ từ code:
- tạo card thất bại → rollback `previous`
- update board thất bại → restore cache cũ

## 12) Câu hỏi phỏng vấn hay gặp
### 12.1 Vì sao dùng TanStack Query thay vì fetch trực tiếp?
- Vì nó quản lý cache server state tốt hơn, giảm code lặp, dễ invalidate.

### 12.2 `staleTime` là gì?
- Là khoảng thời gian dữ liệu được xem là còn tươi, tránh refetch không cần thiết.

### 12.3 Khi nào dùng `invalidateQueries`, khi nào dùng `setQueryData`?
- `setQueryData`: khi muốn UI update ngay và biết chính xác thay đổi.
- `invalidateQueries`: khi muốn refetch từ server cho an toàn.

### 12.4 Optimistic update có rủi ro gì?
- UI có thể hiển thị tạm sai nếu request fail.
- Phải có rollback rõ ràng.

### 12.5 Vì sao query key phải nhất quán?
- Vì invalidate sai key thì cache không refresh, hoặc refresh quá rộng gây tốn network.

## 13) Cách bạn trả lời ngắn trong phỏng vấn
> TeamHub dùng TanStack Query để quản lý server state, cache theo query key rõ ràng và invalidate sau mutation. Với các thao tác cần cảm giác realtime như tạo list, tạo card, rename hoặc drag & drop, em dùng optimistic update để UI phản hồi ngay, rồi rollback nếu request lỗi. Còn những chỗ phức tạp hơn thì em invalidate để refetch từ server cho an toàn.
