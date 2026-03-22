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
FE -> API: POST /lists/{listId}/cards (JWT)
API -> DB: INSERT Card(position=...)
DB --> API: Card row
API -> DB: INSERT ActivityLog(CREATE,CARD)
DB --> API: ok
API --> FE: 201 Created (CardDTO)

API -> WS: emit room workspace:<id>\ncard:changed (created)
WS -> OC: card:changed (created)

== Move Card (drag-drop) ==
U -> FE: Drag Card to new list / position
FE -> API: PATCH /cards/{cardId}\n{listId,newPosition}
API -> DB: UPDATE Card(listId,position)
DB --> API: ok
API -> DB: INSERT ActivityLog(MOVE,CARD)\n(data: fromList,toList,positions)
DB --> API: ok
API --> FE: 200 OK

API -> WS: emit room workspace:<id>\ncard:changed (moved)
WS -> OC: card:changed (moved)
@enduml
```

## Sequence Diagram — Invites (Workspace inbox + Board direct add)

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

== Board add member (direct) ==
note over FE,API
Board "invite" is now direct add.
Requires board ADMIN/OWNER.
Target user must already be a workspace member.
end note

U -> FE: Add member by email
FE -> API: POST /boards/{boardId}/members/by-email {email,role}
API -> DB: INSERT board_members
DB --> API: member row
API --> FE: 201 { member }
@enduml
```