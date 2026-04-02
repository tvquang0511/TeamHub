# Sequence Diagram — Create/Move Card (REST + Realtime)

```plantuml
@startuml
autonumber
actor "User" as U
participant "Frontend (React)" as FE
participant "Backend API (Express)" as API
database "PostgreSQL" as DB
participant "Socket.IO Server" as WS
participant "Other Clients\n(in same workspace)" as OC

== Create Card ==
U -> FE: Fill title + submit
FE -> API: POST /cards {listId,title,...} (JWT)
API -> DB: INSERT cards(position=...)
DB --> API: Card row
API -> DB: INSERT activities(type=CARD_CREATED)
DB --> API: ok
API --> FE: 201 Created (CardDTO)

API -> WS: emit room board:<boardId>\nboard:card_created
WS -> OC: board:card_created

== Move Card (drag-drop) ==
U -> FE: Drag Card to new list / position
FE -> API: POST /cards/{cardId}/move\n{listId?,prevId?,nextId?}
API -> DB: UPDATE cards(list_id,position)
DB --> API: ok
API -> DB: INSERT activities(type=CARD_MOVED)
DB --> API: ok
API --> FE: 200 OK

API -> WS: emit room board:<boardId>\nboard:card_moved
WS -> OC: board:card_moved
@enduml
```

## Sequence Diagram — Invites (Workspace inbox + Accept-by-token)

```plantuml
@startuml
autonumber
actor "User" as U
participant "Frontend (React)" as FE
participant "Backend API (Express)" as API
database "PostgreSQL" as DB

== Workspace invite (requires accept) ==
note over FE,API
Workspace invites are shown in an inbox dropdown.
Accept/Decline are user-centric (no token needed).
end note

U -> FE: Open topbar inbox
FE -> API: GET /invites/inbox/workspaces (JWT)
API -> DB: SELECT workspace_invites
DB --> API: pending invites
API --> FE: 200 { invites: [...] }

U -> FE: Click "Accept"
FE -> API: POST /invites/inbox/workspaces/{inviteId}/accept (JWT)
API -> DB: UPDATE workspace_invites.accepted_at
API -> DB: INSERT workspace_members
DB --> API: ok
API --> FE: 200 { workspace }

== Accept by token (email link) ==
note over FE,API
Flow used when user opens invite link in email.
Backend validates token + expiry.
end note

U -> FE: Open invite link
FE -> API: GET /invites/{token} (JWT)
API -> DB: SELECT workspace_invites by token
DB --> API: invite details
API --> FE: 200 { invite }

U -> FE: Click "Join"
FE -> API: POST /invites/{token}/accept (JWT)
API -> DB: UPDATE workspace_invites.accepted_at
API -> DB: INSERT workspace_members
DB --> API: ok
API --> FE: 200 { workspace }
@enduml
```

## Sequence Diagram — Attachment Upload (Presign PUT + Commit)

```plantuml
@startuml
autonumber
actor "User" as U
participant "Frontend (React)" as FE
participant "Backend API (Express)" as API
database "PostgreSQL" as DB
participant "Object Storage (MinIO/S3)" as S3

== Presign ==
U -> FE: Click "Attach file"
FE -> API: POST /attachments/cards/{cardId}/presign (JWT)
API --> FE: 200 { uploadUrl, objectKey, bucket }

== Upload ==
FE -> S3: PUT uploadUrl (file bytes)
S3 --> FE: 200 OK

== Commit metadata ==
FE -> API: POST /attachments/cards/{cardId}/files\n{bucket,objectKey,fileName,mimeType,size}
API -> DB: INSERT card_attachments(type=FILE,...)
DB --> API: attachment row
API --> FE: 201 { attachment }
@enduml
```

## Sequence Diagram — Analytics Daily Rollup (BullMQ)

```plantuml
@startuml
autonumber
participant "Scheduler\n(repeatable job)" as SCH
participant "Redis (BullMQ)" as R
participant "Worker" as W
database "PostgreSQL" as DB

SCH -> R: enqueue analytics:daily\n{dateRange}
R -> W: deliver job
W -> DB: read activities + cards/lists
W -> DB: upsert board_metrics_daily\n(+ monthly aggregation)
DB --> W: ok
W -> R: job completed
@enduml
```