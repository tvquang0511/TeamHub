# API Endpoints Blueprint

> Convention: Nginx proxies `/api/*` -> backend `/*`.
> If you keep it this way, backend routes do NOT include `/api`.

## 1) Auth
### POST `/auth/register`
Request
```json
{ "email": "user@mail.com", "password": "password123", "displayName": "Quang" }
```
Response (201)
```json
{ "accessToken": "jwt", "user": { "id": "uuid", "email": "user@mail.com", "displayName": "Quang" } }
```
Notes
- Refresh token is set as an **httpOnly cookie** (not returned in JSON).

### POST `/auth/login`
Request
```json
{ "email": "user@mail.com", "password": "password123" }
```
Response
```json
{
  "accessToken": "jwt",
  "user": { "id": "uuid", "email": "user@mail.com", "displayName": "Quang" }
}
```
Notes
- Refresh token is set as an **httpOnly cookie** (not returned in JSON).

### POST `/auth/refresh`
Response
```json
{ "accessToken": "jwt" }
```
Notes
- Server reads refresh token from cookie (browser must send credentials).
- For backward compatibility (Postman), server may accept `refreshToken` in body.

### POST `/auth/logout`
Response
```json
{ "ok": true }
```
Notes
- Server clears refresh cookie.

### GET `/auth/me`
Auth: Bearer access token  
Response
```json
{ "user": { "id": "uuid", "email": "user@mail.com", "displayName": "Quang" } }
```

### POST `/auth/forgot-password`
Request
```json
{ "email": "user@mail.com" }
```
Response (200)
```json
{ "ok": true }
```
Notes
- Always returns `{ ok: true }` to avoid leaking whether an email exists.
- Server sends a reset email (via BullMQ worker).

### POST `/auth/reset-password`
Request
```json
{ "token": "token-from-email", "newPassword": "newPassword123" }
```
Response (200)
```json
{ "ok": true }
```
Notes
- Token is delivered via email link. The web app uses `#token=...` (URL fragment) to reduce token leakage via logs/referrers.
- API still expects the token in JSON body.

## 2) Workspaces
### POST `/workspaces`
Request
```json
{ "name": "My Workspace", "description": "optional" }
```
Response
```json
{ "workspace": { "id": "uuid", "name": "My Workspace", "description": null, "createdAt": "iso", "updatedAt": "iso" } }
```

### GET `/workspaces`
Response
```json
{ "workspaces": [ { "id": "uuid", "name": "My Workspace", "role": "OWNER" } ] }
```

### GET `/workspaces/:id`
Response
```json
{ "workspace": { "id": "uuid", "name": "My Workspace" } }
```

### GET `/workspaces/:id/members`
Response
```json
{
  "members": [
    { "id": "uuid", "userId": "uuid", "displayName": "Quang", "role": "OWNER" }
  ]
}
```

## 3) Workspace member management
### PATCH `/workspaces/:id/members/:userId`
Request
```json
{ "role": "ADMIN" }
```
Response
```json
{ "member": { "id": "uuid", "userId": "uuid", "displayName": "Quang", "role": "ADMIN" } }
```

### DELETE `/workspaces/:id/members/:userId`
Response
```json
{ "ok": true }
```

### POST `/workspaces/:id/leave`
Response
```json
{ "ok": true }
```

## 4) Users
### GET `/users/search?q=...&workspaceId=...&limit=10`
Response
```json
{ "users": [ { "id": "uuid", "email": "user@mail.com", "displayName": "User", "workspaceRole": "OWNER|ADMIN|MEMBER" } ] }
```

## 5) Invites
### Workspace invites

### POST `/invites/workspaces/:workspaceId`
Request
```json
{ "email": "invitee@mail.com", "expiresAt": "iso(optional)" }
```
Response
```json
{ "invite": { "id": "uuid", "email": "invitee@mail.com", "token": "string", "expiresAt": "iso" } }
```

### GET `/invites/workspaces/:workspaceId`
Response
```json
{ "invites": [ { "id": "uuid", "workspaceId": "uuid", "email": "invitee@mail.com", "expiresAt": "iso", "acceptedAt": "iso|null", "createdAt": "iso" } ] }
```

### DELETE `/invites/workspaces/:workspaceId/:inviteId`
Response
```json
{ "ok": true }
```

### GET `/invites/:token`
Response
```json
{ "invite": { "id": "uuid", "workspaceId": "uuid", "email": "invitee@mail.com", "expiresAt": "iso", "acceptedAt": "iso|null", "createdAt": "iso" }, "workspace": { "id": "uuid", "name": "My Workspace" } }
```

### POST `/invites/:token/accept`
Response
```json
{ "workspace": { "id": "uuid", "name": "My Workspace" } }
```

### Inbox (topbar)

### GET `/invites/inbox/workspaces`
Response
```json
{
  "invites": [
    {
      "invite": {
        "id": "uuid",
        "workspaceId": "uuid",
        "email": "invitee@mail.com",
        "expiresAt": "iso",
        "acceptedAt": null,
        "createdAt": "iso"
      },
      "workspace": { "id": "uuid", "name": "My Workspace" }
    }
  ]
}
```

### POST `/invites/inbox/workspaces/:inviteId/accept`
Response
```json
{ "workspace": { "id": "uuid", "name": "My Workspace" } }
```

### POST `/invites/inbox/workspaces/:inviteId/decline`
Response
```json
{ "ok": true }
```

### Board “invite” (direct add)

Board members are now managed directly via Boards endpoints (no token/accept flow).

### POST `/boards/:id/members/by-email`
Request
```json
{ "email": "member@mail.com", "role": "MEMBER" }
```
Response
```json
{ "member": { "id": "uuid", "boardId": "uuid", "userId": "uuid", "role": "MEMBER" } }
```

## 6) Boards/Lists/Cards (Trello-like)
### POST `/boards`
Request
```json
{ "workspaceId": "uuid", "name": "Board A", "description": "optional", "visibility": "PRIVATE|WORKSPACE" }
```
Response
```json
{ "board": { "id": "uuid", "workspaceId": "uuid", "name": "Board A" } }
```

### PATCH `/boards/:bid/visibility`
Auth: Bearer access token

Request
```json
{ "visibility": "PRIVATE|WORKSPACE" }
```

Response
```json
{ "board": { "id": "uuid", "workspaceId": "uuid", "name": "Board A", "visibility": "PRIVATE|WORKSPACE" } }
```

Notes
- Only board `OWNER|ADMIN` can update visibility.

### PATCH `/boards/:bid/background`
Auth: Bearer access token

Request (solid color)
```json
{ "backgroundColor": "#111827" }
```

Request (gradient)
```json
{ "backgroundLeftColor": "#667eea", "backgroundRightColor": "#764ba2", "backgroundSplitPct": 50 }
```

Response
```json
{
  "board": {
    "id": "uuid",
    "backgroundColor": null,
    "backgroundLeftColor": "#667eea",
    "backgroundRightColor": "#764ba2",
    "backgroundSplitPct": 50
  }
}
```

Notes
- Only board `OWNER|ADMIN` can update background.
- Workspace board list `GET /boards?workspaceId=...` should include these background fields for card rendering.

### PATCH `/boards/:bid` (legacy)

This endpoint exists for backward compatibility. Prefer using the dedicated endpoints above.

### DELETE `/boards/:bid`
Auth: Bearer access token

Notes
- Soft-delete (archive): server sets `archivedAt`.
- Requires board role: `OWNER` or `ADMIN`.

Response
```json
{ "ok": true }
```

### GET `/boards/:bid/detail`
Response (one-shot payload)
```json
{
  "board": { "id": "uuid", "name": "Board A" },
  "lists": [ { "id": "uuid", "name": "Todo", "position": 1024 } ],
  "cards": [ { "id": "uuid", "listId": "uuid", "title": "Card 1", "position": 1024 } ],
  "labels": [],
  "members": [],
  "actor": {
    "workspaceRole": "OWNER|ADMIN|MEMBER",
    "boardVisibility": "PRIVATE|WORKSPACE",
    "isBoardMember": true,
    "boardRole": "OWNER|ADMIN|MEMBER|null",
    "canReadBoard": true,
    "canWriteBoard": true,
    "canManageBoardMembers": true,
    "canInviteToBoard": true,
    "canUpdateBoardSettings": true,
    "canDeleteBoard": true,
    "canLeaveBoard": true,
    "readOnlyReason": "WORKSPACE_ADMIN_READ_ONLY|WORKSPACE_READ_ONLY|null"
  }
}
```

### POST `/lists`
Request
```json
{ "boardId": "uuid", "name": "Todo" }
```
Response
```json
{ "list": { "id": "uuid", "boardId": "uuid", "name": "Todo", "position": 1024 } }
```

### PATCH `/lists/:lid`
Request
```json
{ "name": "Doing" }
```
Response
```json
{ "list": { "id": "uuid", "name": "Doing" } }
```

### DELETE `/lists/:lid`
Auth: Bearer access token

Notes
- Soft-delete (archive): set list `archivedAt`, and archive all cards in that list.
- Requires being a board member of the list's board.

Response
```json
{ "ok": true }
```

### POST `/cards`
Request
```json
{ "listId": "uuid", "title": "Card title", "description": "optional" }
```
Response
```json
{ "card": { "id": "uuid", "listId": "uuid", "title": "Card title", "position": 1024 } }
```

### PATCH `/cards/:cid`
Request (partial)
```json
{ "title": "New title", "description": "text", "dueAt": "iso|null", "archivedAt": "iso|null" }
```
Response
```json
{ "card": { "id": "uuid", "title": "New title" } }
```

### DELETE `/cards/:cid`
Auth: Bearer access token

Notes
- Soft-delete (archive): server sets `archivedAt`.
- Requires being a board member of the card's board.

Response
```json
{ "ok": true }
```

### POST `/cards/:cid/move`
Request
```json
{ "listId": "uuid(optional)", "prevId": "uuid|null", "nextId": "uuid|null" }
```
Response
```json
{ "card": { "id": "uuid", "listId": "uuid", "position": 1536 } }
```

## 7) Attachments (private MinIO + URL shortcuts)

Attachments belong to a **card**.


### GET `/attachments/cards/:cardId`
Auth: Bearer access token

Response
```json
{ "attachments": [ { "id": "uuid", "type": "FILE|LINK" } ] }
```

#### Create card reference attachment

Create an attachment on a card that references another card in the same board.

- **POST** `/attachments/cards/:cardId/cards`

Body:

- `referencedCardId` (string, required)
- `linkTitle` (string, optional)

### POST `/attachments/cards/:cardId/presign`
Auth: Bearer access token

Purpose: create a presigned **PUT** URL for uploading a file directly to MinIO.

Request
```json
{ "fileName": "hello.txt", "mimeType": "text/plain", "size": 12 }
```

Response
```json
{
  "presign": {
    "uploadUrl": "http://localhost:9000/teamhub/...?...",
    "method": "PUT",
    "headers": { "Content-Type": "text/plain" },
    "bucket": "teamhub",
    "objectKey": "cards/<cardId>/..._hello.txt",
    "url": "http://localhost:9000/teamhub/...",
    "expiresIn": 300
  }
}
```

Notes
- Client must PUT the file to `uploadUrl` with the returned headers.
- After upload, client must call **commit** endpoint below.

### POST `/attachments/cards/:cardId/files`
Auth: Bearer access token

Purpose: create the DB record after uploading to MinIO.

Request
```json
{ "bucket": "teamhub", "objectKey": "cards/<cardId>/...", "url": "http://...", "fileName": "hello.txt", "mimeType": "text/plain", "size": 12 }
```

Response (201)
```json
{ "attachment": { "id": "uuid", "type": "FILE", "bucket": "teamhub", "objectKey": "cards/<cardId>/..." } }
```

### POST `/attachments/:attachmentId/presign-download`
Auth: Bearer access token

Purpose: generate a presigned **GET** URL for downloading a private file.

Response
```json
{ "presign": { "downloadUrl": "http://localhost:9000/teamhub/...?...", "method": "GET", "expiresIn": 300 } }
```

### POST `/attachments/cards/:cardId/links`
Auth: Bearer access token

Request
```json
{ "linkUrl": "https://example.com/article", "linkTitle": "Example Article" }
```

Response (201)
```json
{ "attachment": { "id": "uuid", "type": "LINK", "linkUrl": "https://example.com/article" } }
```

## 8) Labels

Board-scoped labels (similar to Trello). Labels are created under a board, then attached to individual cards.

### GET `/labels?boardId={boardId}`
Auth: Bearer access token

Response
```json
{ "labels": [ { "id": "uuid", "boardId": "uuid", "name": "Bug", "color": "#EF4444" } ] }
```

### POST `/labels`
Auth: Bearer access token

Request
```json
{ "boardId": "uuid", "name": "Bug", "color": "#EF4444" }
```

Response (201)
```json
{ "label": { "id": "uuid", "boardId": "uuid", "name": "Bug", "color": "#EF4444" } }
```

### PATCH `/labels/:id`
Auth: Bearer access token

Request
```json
{ "name": "High priority", "color": "#F59E0B" }
```

Response
```json
{ "label": { "id": "uuid", "boardId": "uuid", "name": "High priority", "color": "#F59E0B" } }
```

### DELETE `/labels/:id`
Auth: Bearer access token

Response
```json
{ "ok": true }
```

### GET `/cards/:id/labels`
Auth: Bearer access token

Response
```json
{ "labels": [ { "id": "uuid", "workspaceId": "uuid", "name": "Bug", "color": "#EF4444" } ] }
```

### POST `/cards/:id/labels/:labelId`
Auth: Bearer access token

Notes
- Attach is idempotent: if already attached, server returns `{ "ok": true }`.

### DELETE `/cards/:id/labels/:labelId`
Auth: Bearer access token

Response
```json
{ "ok": true }
```

### DELETE `/attachments/:attachmentId`
Auth: Bearer access token

Response
```json
{ "ok": true }
```

## 9) Reminders (BullMQ + Redis)

Reminders are per-user. A reminder schedules an email at `remindAt`.

### GET `/cards/:id/reminders`
Auth: Bearer access token

Response
```json
{ "reminders": [ { "id": "uuid", "cardId": "uuid", "userId": "uuid", "remindAt": "iso", "status": "PENDING" } ] }
```

### PUT `/cards/:id/reminders`
Auth: Bearer access token

Request
```json
{ "remindAt": "2026-03-28T10:00:00.000Z" }
```

Response (201)
```json
{ "reminder": { "id": "uuid", "cardId": "uuid", "userId": "uuid", "remindAt": "iso", "status": "PENDING" } }
```

Notes
- Implementation may enqueue a **delayed BullMQ job** (stored in Redis) for `remindAt`.

### DELETE `/cards/:id/reminders/:reminderJobId`
Auth: Bearer access token

Response
```json
{ "ok": true }
```
