# Backlog — Epics

## EPIC-01: Project bootstrap & DevOps
- Docker compose: postgres/redis/rabbitmq/nginx
- Monorepo structure
- ESLint/Prettier/TS configs
- CI (later)

## EPIC-02: Auth (JWT + refresh tokens)
- Register/Login/Refresh/Logout
- Password hashing
- Refresh token rotation + revoke

## EPIC-03: Workspace & Membership
- Create workspace, list my workspaces
- Member listing
- Invite flow via email + accept token
- Role management (optional)

## EPIC-04: Kanban core (Boards/Lists/Cards)
- CRUD boards/lists/cards
- position float ordering
- Move/reorder card endpoint
- Archive behavior

## EPIC-05: Realtime (Socket.IO)
- JWT auth handshake
- workspace join, board join
- Broadcast events for board actions
- Chat realtime events

## EPIC-06: Chat (Workspace)
- Send message (socket)
- Persist messages
- History API with cursor

## EPIC-07: Reminder (SMTP worker)
- Set/cancel reminder endpoints
- reminder_jobs table + indexes
- Worker poll + retry logic
- Email templates

## EPIC-08: Card details
- Comments
- Labels
- Assignees
- Checklists + items

## EPIC-09: Activity log
- Log minimal events sync (MVP)
- RabbitMQ async pipeline (phase 2)