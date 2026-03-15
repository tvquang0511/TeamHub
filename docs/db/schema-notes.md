# Database Schema Notes (Prisma/Postgres)

## 1) Core tables
- users
- refresh_tokens (store hashed token, revoke support)
- workspaces
- workspace_members (userId + workspaceId + role)
- workspace_invites (token + expiresAt + acceptedAt)
- workspace_messages (chat)

Kanban:
- boards (workspaceId)
- lists (boardId, position float, archivedAt)
- cards (listId, position float, archivedAt, dueAt)

Card details:
- card_assignees (N-N users)
- labels (workspaceId)
- card_labels (N-N labels)
- checklists (cardId, position)
- checklist_items (checklistId, position, isDone)
- card_comments (cardId)

Reminder:
- reminder_jobs (cardId + userId + remindAt + status + attempts + lastError)

Optional:
- activities (actorId + workspaceId/boardId/cardId + type + payload json)

## 2) Position float
Use numeric/decimal in Postgres for stability:
- Prisma: `Decimal`
- Postgres: `numeric`
Rules:
- newPos between prev/next
- begin/end cases
- rebalance when gap is too small

## 3) Suggested constraints
- workspace_members: unique (workspaceId, userId)
- refresh_tokens: unique token hash (or unique id), index userId
- reminder_jobs: unique (cardId, userId, remindAt) if you want duplicate prevention

## 4) Indexes (minimum)
- lists: (boardId, position)
- cards: (listId, position)
- workspace_messages: (workspaceId, createdAt)
- reminder_jobs: (status, remindAt)

## 5) Soft delete / archive
- board/list/card: `archivedAt` nullable timestamp
- queries should filter `archivedAt IS NULL` by default