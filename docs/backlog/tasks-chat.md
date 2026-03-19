# Tasks — Board Chat

## Tasks
1. DB: board_messages
2. Socket.IO
   - auth handshake (JWT)
   - board join membership check
3. chat:send handler
   - validate content length
   - insert message
   - emit chat:new_message to room
4. History API
   - cursor pagination by (createdAt,id)
5. Rate limit (phase 2)
   - Redis key per user/board

## Acceptance criteria
- 2 clients in same board see message instantly
- Non-member cannot join/receive