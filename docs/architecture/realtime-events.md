# Realtime Events Contract (Socket.IO)

## 1) Namespace & transport
- Socket.IO default namespace `/`
- Auth via JWT in handshake or first message.
- All server emits should be scoped to rooms.

## 2) Rooms
- `workspace:{workspaceId}`:
  - Chat events
  - (Optional) workspace-level events (member joined, board created...)
- `board:{boardId}`:
  - Board/list/card events (reorder, move, comment...)

## 3) Client -> Server events

### 3.1 `workspace:join`
**Payload**
```json
{ "workspaceId": "uuid" }
```
**Auth**: user must be member of workspace  
**Ack**
```json
{ "ok": true }
```

### 3.2 `board:join`
**Payload**
```json
{ "boardId": "uuid" }
```
**Auth**: user must be member of workspace that owns the board  
**Ack**
```json
{ "ok": true }
```

### 3.3 `chat:send`
**Payload**
```json
{ "workspaceId": "uuid", "content": "string" }
```
**Rules**
- content non-empty
- limit length (e.g. 2000 chars)
- rate limit optional (Redis phase 2)

## 4) Server -> Client events (minimum)

### 4.1 `chat:new_message`
```json
{
  "message": {
    "id": "uuid",
    "workspaceId": "uuid",
    "senderId": "uuid",
    "senderDisplayName": "string",
    "content": "string",
    "createdAt": "iso"
  }
}
```

### 4.2 `board:list_created`
```json
{ "list": { "id": "uuid", "boardId": "uuid", "name": "string", "position": 1024 } }
```

### 4.3 `board:list_updated`
```json
{ "list": { "id": "uuid", "name": "string" } }
```

### 4.4 `board:list_reordered`
```json
{ "listId": "uuid", "position": 2048 }
```

### 4.5 `board:card_created`
```json
{ "card": { "id": "uuid", "listId": "uuid", "title": "string", "position": 1024 } }
```

### 4.6 `board:card_updated`
```json
{ "card": { "id": "uuid", "title": "string", "description": "string|null", "dueAt": "iso|null" } }
```

### 4.7 `board:card_moved`
```json
{ "cardId": "uuid", "fromListId": "uuid", "toListId": "uuid", "position": 1536 }
```

### 4.8 `board:comment_added`
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

### 4.9 `board:rebalance_done` (optional)
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