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

### GET `/me`
Auth: Bearer access token  
Response
```json
{ "user": { "id": "uuid", "email": "user@mail.com", "displayName": "Quang" } }
```

## 2) Workspaces
### POST `/workspaces`
Request
```json
{ "name": "My Workspace" }
```
Response
```json
{ "workspace": { "id": "uuid", "name": "My Workspace" } }
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

## 3) Invites
### POST `/invites/workspaces/:workspaceId`
Request
```json
{ "email": "invitee@mail.com", "expiresAt": "iso" }
```
Response
```json
{ "invite": { "id": "uuid", "email": "invitee@mail.com", "expiresAt": "iso" } }
```

### POST `/invites/:token/accept`
Response
```json
{ "workspace": { "id": "uuid", "name": "My Workspace" } }
```

### POST `/invites/boards/:boardId`
Request
```json
{ "email": "invitee@mail.com", "expiresAt": "iso" }
```
Response
```json
{ "invite": { "id": "uuid", "email": "invitee@mail.com", "expiresAt": "iso" } }
```

### POST `/invites/boards/token/:token/accept`
Response
```json
{ "board": { "id": "uuid", "name": "Board A", "workspaceId": "uuid" } }
```

## 3.1) Workspace member management
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

## 3.2) Users
### GET `/users/search?q=...&workspaceId=...&limit=10`
Response
```json
{ "users": [ { "id": "uuid", "email": "user@mail.com", "displayName": "User" } ] }
```

## 4) Chat
### GET `/workspaces/:id/messages?cursor=...`
Response
```json
{
  "messages": [
    { "id": "uuid", "content": "hello", "senderId": "uuid", "createdAt": "iso" }
  ],
  "nextCursor": "string|null"
}
```

## 5) Boards/Lists/Cards (Trello-like)
### POST `/workspaces/:wid/boards`
Request
```json
{ "name": "Board A", "description": "optional" }
```
Response
```json
{ "board": { "id": "uuid", "workspaceId": "uuid", "name": "Board A" } }
```

### GET `/boards/:bid`
Response (suggested one-shot payload)
```json
{
  "board": { "id": "uuid", "name": "Board A" },
  "lists": [ { "id": "uuid", "name": "Todo", "position": 1024 } ],
  "cards": [ { "id": "uuid", "listId": "uuid", "title": "Card 1", "position": 1024 } ],
  "labels": [],
  "members": []
}
```

### POST `/boards/:bid/lists`
Request
```json
{ "name": "Todo" }
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

### POST `/lists/:lid/cards`
Request
```json
{ "title": "Card title" }
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

### POST `/cards/:cid/move`
Request
```json
{ "toListId": "uuid", "prevCardId": "uuid|null", "nextCardId": "uuid|null" }
```
Response
```json
{ "card": { "id": "uuid", "listId": "uuid", "position": 1536 } }
```

## 6) Card details
### POST `/cards/:cid/comments`
Request
```json
{ "content": "comment text" }
```
Response
```json
{ "comment": { "id": "uuid", "cardId": "uuid", "content": "comment text" } }
```

### Reminders
### PUT `/cards/:cid/reminders`
Request
```json
{ "remindAt": "iso" }
```
Response
```json
{ "reminderJob": { "id": "uuid", "cardId": "uuid", "remindAt": "iso", "status": "PENDING" } }
```

### DELETE `/cards/:cid/reminders/:reminderJobId`
Response
```json
{ "ok": true }
```

### GET `/cards/:cid/reminders`
Response
```json
{ "reminders": [ { "id": "uuid", "remindAt": "iso", "status": "PENDING" } ] }
```