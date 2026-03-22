# TeamHub — Current Implementation Status (Backend + Frontend contract)

> Mục tiêu của file này: tổng hợp những gì đã có **trong code hiện tại**, mô tả **luồng auth cookie**, các **module backend**, và đề xuất **cây thư mục frontend `src/`** để Figma Make (hoặc team) sinh UI theo đúng contract.

## 1) Big picture

TeamHub là một Trello-like Kanban app với:

- **Backend**: Express + TypeScript, Prisma + Postgres
- **Auth**: JWT access token + refresh token **rotation**, lưu hash refresh trong DB
- **Refresh token**: vận hành theo mô hình **httpOnly cookie** (FE không cầm refresh token)
- **Modules**: workspaces, boards, lists, cards, invites (workspace + board), users search, chat, reminders...
- **Docs**: OpenAPI `/openapi.json` + Swagger UI `/api-docs` (backend)

## 2) Backend architecture (code map)

### 2.1 Entry points

- `backend/src/main.ts`: start server
- `backend/src/app.ts`:
  - middleware `cors` (allow FE origin + `credentials: true`)
  - `helmet`, `morgan`, body parsers
  - OpenAPI `GET /openapi.json`, Swagger `GET /api-docs`
  - mount API dưới `/api`

### 2.2 Common building blocks

- `backend/src/common/errors/ApiError.ts`: lỗi chuẩn hoá
- `backend/src/common/middlewares/errorHandler.ts`: trả JSON error thống nhất
- `backend/src/common/utils/position.ts`: tính `position` theo prev/next anchors (fractional indexing)

### 2.3 Modules

Trong `backend/src/modules/*` (mỗi module có router/controller/service/repo):

- `auth/`: đăng ký/đăng nhập/refresh/logout + refresh rotation
- `workspaces/`: workspace CRUD + membership
- `boards/`: boards + members + board privacy (PRIVATE/WORKSPACE)
- `lists/`: lists + move/reorder (Decimal position)
- `cards/`: cards + move/reorder + detail operations
- `invites/`: **central invites module** (workspace invites + board invites)
- `users/`: `GET /users/search` phục vụ autocomplete/email search
- `chat/`: chat theo board/workspace (Socket/REST tuỳ module)
- `reminders/`: reminder scheduling/email
- `labels/`, `comments/` (tuỳ mức hiện có trong repo)

> Các route được mount ở `backend/src/routes/index.ts` dưới prefix `/api`.

## 3) Auth: cookie-based refresh model (VERY IMPORTANT for FE)

### 3.1 Token model

- **Access token** (JWT):
  - TTL ngắn (vd: 15m)
  - FE lưu **in-memory** (trong `AuthProvider`), gửi qua header `Authorization: Bearer ...`
- **Refresh token** (JWT + DB session):
  - TTL dài (vd: 7d)
  - **Không trả về/không lưu ở localStorage**
  - Được set vào **httpOnly cookie**: `teamhub_refresh` (configurable)
  - Mỗi refresh sẽ **rotate** refresh token (revoke old + create new)

### 3.2 CORS & cookie

- Backend bật CORS `credentials: true`
- `CORS_ORIGIN` có thể set theo env (comma-separated). Mặc định cho dev: `http://localhost:5173`

### 3.3 Endpoints (contract đề xuất cho FE)

> Lưu ý: backend mount dưới `/api`, nên FE gọi `/api/auth/*`.

- `POST /api/auth/register`
  - body: `{ email, password, displayName }`
  - set-cookie: refresh token (httpOnly)
  - response: `{ accessToken, user }`

- `POST /api/auth/login`
  - body: `{ email, password }`
  - set-cookie: refresh token (httpOnly)
  - response: `{ accessToken, user }`

- `POST /api/auth/refresh`
  - body: `{}` (cookie tự gửi lên nhờ `withCredentials`)
  - response: `{ accessToken }`
  - set-cookie: refresh token mới (rotation)

- `POST /api/auth/logout`
  - body: `{}`
  - response: `{ ok: true }`
  - clear-cookie

### 3.4 FE behavior recommended

- axios instance: `withCredentials: true`
- interceptor:
  - nếu gặp `401` → gọi `/auth/refresh` một lần → retry request
  - nếu refresh fail → clear access token → đưa user về `/login`

## 4) Backend modules & key API surface (FE-relevant)

> Đây là các endpoint đã được build để FE dễ làm MVP.

### 4.1 Users search (autocomplete)

- `GET /api/users/search?q=...&limit=...`
  - dùng cho "Add member by email" và invite flows

### 4.2 Workspaces

- `GET /api/workspaces`
- `GET /api/workspaces/:id`
- `GET /api/workspaces/:id/members`
- member management:
  - `PATCH /api/workspaces/:id/members/:userId` (update role)
  - `DELETE /api/workspaces/:id/members/:userId`
  - `POST /api/workspaces/:id/leave`

### 4.3 Invites (centralized)

- workspace invites:
  - `POST /api/invites/workspaces/:workspaceId`
  - `POST /api/invites/:token/accept`
- inbox (topbar):
  - `GET /api/invites/inbox/workspaces`
  - `POST /api/invites/inbox/workspaces/:inviteId/accept`
  - `POST /api/invites/inbox/workspaces/:inviteId/decline`

### 4.4 Boards / Lists / Cards

- Board detail one-shot (FE-friendly):
  - `GET /api/boards/:id/detail`
    - trả board + lists + cards + members + labels (tuỳ version)

- Add board member by email:
  - `POST /api/boards/:id/members/by-email` body `{ email }`

- Move/reorder:
  - `POST /api/lists/:id/move` body `{ prevListId, nextListId }`
  - `POST /api/cards/:id/move` body `{ toListId, prevCardId, nextCardId }`

## 5) Error envelope (FE parsing)

Backend trả lỗi dạng:

```json
{
  "error": {
    "code": "SOME_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

FE nên:

- show `error.message`
- log `error.code` cho debug

## 6) Recommended frontend `src/` tree (extensible)

> Mục tiêu: chia theo layers + features, UI dễ thay bởi Figma Make.

```txt
src/
  app/
    router/
      routes.tsx            # route objects
      AppRouter.tsx         # RouterProvider
    providers/
      AuthProvider.tsx      # access token in-memory + bootstrap refresh
      QueryProvider.tsx     # TanStack Query
      SocketProvider.tsx    # (later) socket.io
    layouts/
      AppLayout.tsx         # top bar + workspace switcher
      BoardLayout.tsx       # board header + sidebars

  shared/
    api/
      http.ts               # axios instance + refresh interceptor
      auth.api.ts
      users.api.ts
      workspaces.api.ts
      boards.api.ts
      lists.api.ts
      cards.api.ts
    components/
      layout/
        TopBar.tsx
        AppShell.tsx
      ui/                   # Tailwind-first primitives; shadcn only when necessary
        Button.tsx
        Input.tsx
        Card.tsx
        Modal.tsx           # suggest using shadcn Dialog
        Dropdown.tsx        # suggest using shadcn Dropdown
    lib/
      cn.ts
      format.ts
      invariant.ts
    types/
      api.ts                # shared api types (generated/manual)

  features/
    auth/
      pages/
        LoginPage.tsx
        RegisterPage.tsx
    workspace/
      pages/
        WorkspaceListPage.tsx
        WorkspaceDetailPage.tsx
      components/
        MemberTable.tsx
    board/
      pages/
        BoardPage.tsx
      components/
        BoardHeader.tsx
        ListColumn.tsx
        CardItem.tsx
        AddMemberDialog.tsx

  pages/
    DevHomePage.tsx         # optional dev-only

  main.tsx
  App.tsx
  index.css
```

### Notes for Figma Make

- Focus on producing:
  - `BoardPage` (Trello-like) dựa trên `GET /boards/:id/detail`
  - `AddMemberDialog` sử dụng `GET /users/search` và `POST /boards/:id/members/by-email`
- Avoid localStorage refresh token. Access token is memory-only.

## 7) How to extend safely

### 7.1 When adding a new module (backend)

- Create folder `backend/src/modules/<module>`
- Add `*.router.ts` and mount in `backend/src/routes/index.ts`
- Add OpenAPI paths in `backend/src/docs/openapi/paths/<module>.paths.ts`
- Add Postman collection file under `backend/postman/collections/`

### 7.2 When adding a new feature (frontend)

- Add under `src/features/<feature>`
- Keep API calls in `src/shared/api/*`
- Prefer dumb presentational components for Figma-generated UI; keep logic in hooks.

## 8) Known gaps / TODO

- Docs in `docs/api/endpoints.md` still mention refreshToken in body for some auth endpoints; should be updated to cookie model.
- Some UI pages are currently dev scaffolding; goal is to replace with real pages from Figma.
