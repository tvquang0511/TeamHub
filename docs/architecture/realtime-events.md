# Realtime Events Contract (Socket.IO)

## 1) Namespace & transport
- Socket.IO default namespace `/`
- Auth via JWT in handshake or first message.
- All server emits should be scoped to rooms.

## 2) Rooms
- `board:{boardId}`:
  - Board/list/card events (reorder, move, comment...)
  - Chat events (board chat)

## 3) Client -> Server events

### 3.1 `board:join`
**Payload**
```json
{ "boardId": "uuid" }
```
**Auth**: user must be **member of board** (chat is not readable by workspace OWNER/ADMIN unless they are board members)
**Ack**
```json
{ "ok": true }
```

### 3.2 `chat:message:send`
**Payload**
```json
{ "boardId": "uuid", "content": "string" }
```
**Rules**
- content non-empty
- limit length (e.g. 2000 chars)
- rate limit optional (Redis phase 2)

### 3.3 `chat:message:edit`
**Payload**
```json
{ "boardId": "uuid", "messageId": "uuid", "content": "string" }
```
**Rules**
- only author
- only within 20 minutes of `createdAt`
- message must not be deleted

### 3.4 `chat:message:delete`
**Payload**
```json
{ "boardId": "uuid", "messageId": "uuid" }
```
**Rules**
- only author
- only within 20 minutes of `createdAt`

## 4) Server -> Client events (minimum)

### 4.1 `chat:message:new`
```json
{
  "message": {
    "id": "uuid",
    "boardId": "uuid",
    "senderId": "uuid",
    "content": "string",
    "createdAt": "iso",
    "editedAt": null,
    "deletedAt": null,
    "sender": { "id": "uuid", "displayName": "string", "avatarUrl": null }
  }
}
```

### 4.2 `chat:message:updated`
```json
{ "message": { "id": "uuid", "editedAt": "iso", "content": "string" } }
```

### 4.3 `chat:message:deleted`
```json
{ "boardId": "uuid", "messageId": "uuid" }
```

### 4.4 `board:list_created`
```json
{ "list": { "id": "uuid", "boardId": "uuid", "name": "string", "position": 1024 } }
```

### 4.5 `board:list_updated`
```json
{ "list": { "id": "uuid", "name": "string" } }
```

### 4.6 `board:list_reordered`
```json
{ "listId": "uuid", "position": 2048 }
```

### 4.7 `board:card_created`
```json
{ "card": { "id": "uuid", "listId": "uuid", "title": "string", "position": 1024 } }
```

### 4.8 `board:card_updated`
```json
{ "card": { "id": "uuid", "title": "string", "description": "string|null", "dueAt": "iso|null" } }
```

### 4.9 `board:card_moved`
```json
{ "cardId": "uuid", "fromListId": "uuid", "toListId": "uuid", "position": 1536 }
```

### 4.10 `board:comment_added`
```json
{
  "comment": {
    "id": "uuid",
    "cardId": "uuid",
    "authorId": "uuid",
    "content": "string",
    "createdAt": "iso"
  }
}
```

### 4.11 `board:rebalance_done` (optional)
```json
{ "listId": "uuid" }
```

## 5) Error / Ack format
Recommended ack error:
```json
{ "ok": false, "error": { "code": "FORBIDDEN", "message": "Not a workspace member" } }
```

## 6) Ordering
- Client sorts lists/cards by `position` ascending.
- Realtime events update local state accordingly (optimistic UI allowed).