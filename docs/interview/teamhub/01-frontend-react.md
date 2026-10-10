# Frontend — React (TeamHub dùng gì, trả lời sao)

## 1) React mental model (nói ngắn trong phỏng vấn)
- UI là hàm của state: `UI = f(state)`.
- Re-render là bình thường; tối ưu khi có vấn đề (đừng premature optimize).
- Side effects phải nằm trong `useEffect` (fetch, subscription, socket).

---

## 2) Các hook bạn dùng nhiều trong TeamHub
### `useState`
**Tác dụng:** giữ state cục bộ của component.
**Bạn dùng trong TeamHub:**
- Mở/đóng modal/sheet, draft text, edit mode…
- Ví dụ: `BoardChatPanel` giữ `messages`, `draft`, `editingMessageId`, `pendingUploads`.

### `useEffect`
**Tác dụng:** chạy side-effect theo dependency.
**Bạn dùng trong TeamHub:**
- Setup/cleanup Socket.IO connection khi `boardId` đổi.
- Load initial history + cleanup socket khi component unmount.
- Đồng bộ ref cache cho inline image URLs.

Điểm cần nhấn mạnh khi trả lời:
- cleanup rõ ràng để tránh memory leak (disconnect socket, cancel logic).
- dependency list hợp lý (tránh reconnect liên tục).

### `useMemo`
**Tác dụng:** memo hóa giá trị tính toán.
**Bạn dùng trong TeamHub:**
- Sort messages cũ→mới để UI dễ đọc (`BoardChatPanel`), tránh sort lại quá nhiều.

### `useRef`
**Tác dụng:** lưu mutable reference không trigger re-render.
**Bạn dùng trong TeamHub:**
- Giữ `socketRef` để disconnect đúng.
- Scroll anchor (`bottomRef`) để auto-scroll.
- Lưu cache inline image URLs để kiểm tra expiry.

---

## 3) Routing (React Router)
Bạn dùng:
- `createBrowserRouter` để khai báo routes.
- `useParams` để lấy `boardId`.
- `useSearchParams` để deep-link mở card: `/boards/:id?cardId=...`.

Câu hỏi hay gặp:
- “Vì sao dùng query param cho cardId?”
  - Deep-link shareable, refresh không mất state, back/forward history hợp lý.

---

## 4) Component patterns bạn đang dùng
- **Controlled inputs**: form title/description/dueAt.
- **Modal/Dialog/Sheet** cho card detail, chat panel.
- **Role-based UI**: `canWriteBoard` quyết định canDrag/canDrop và enable actions.

---

## 5) Câu hỏi phỏng vấn + hướng trả lời
1) *Khi nào dùng `useMemo`?*
- Khi tính toán nặng hoặc để giữ reference ổn định; ví dụ sort messages.

2) *`useEffect` dễ bug nhất ở đâu?*
- Dependency sai → chạy thừa/thiếu; cleanup quên → leak subscription/socket.

3) *Bạn xử lý state lớn của board như thế nào?*
- Data server state để React Query quản lý; local state chỉ cho UI (modal/draft).

4) *Bạn tránh re-render thừa kiểu gì?*
- Ưu tiên kiến trúc dữ liệu đúng; optimize sau. `useMemo`/split component khi cần.
