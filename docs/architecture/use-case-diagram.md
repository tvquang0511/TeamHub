# Use case diagram

Use case diagram dưới đây mô tả các tác nhân chính và nhóm chức năng cốt lõi của TeamHub.

> Gợi ý: GitHub Markdown render được Mermaid. Nếu nơi bạn xem không render, hãy copy block `mermaid` sang công cụ Mermaid Live Editor.

```mermaid
usecaseDiagram
  actor Guest as Guest
  actor User as User
  actor "Workspace Owner/Admin" as Admin
  actor Worker as Worker

  rectangle TeamHub {
    (Register/Login/Logout) as UC_Auth
    (Refresh token) as UC_Refresh
    (Forgot/Reset password) as UC_Reset

    (View my workspaces) as UC_WS_List
    (Create workspace) as UC_WS_Create
    (Invite member) as UC_WS_Invite
    (Accept invite) as UC_WS_Accept
    (Manage workspace members/roles) as UC_WS_Roles

    (Create board) as UC_Board_Create
    (Join board) as UC_Board_Join
    (Manage board members) as UC_Board_Members

    (Create/rename/reorder lists) as UC_Lists
    (Create/update/move cards) as UC_Cards
    (Card detail: labels/assignees/checklists/comments) as UC_Card_Detail
    (Attachments: upload & preview) as UC_Attach

    (Board chat realtime) as UC_Chat

    (Set/cancel reminder) as UC_Reminder
    (Send reminder emails) as UC_Worker_Reminder

    (View analytics/statistics) as UC_Analytics
    (Run analytics jobs) as UC_Worker_Analytics
  }

  Guest --> UC_Auth

  User --> UC_Auth
  User --> UC_Refresh
  User --> UC_Reset
  User --> UC_WS_List
  User --> UC_WS_Accept

  Admin --> UC_WS_Create
  Admin --> UC_WS_Invite
  Admin --> UC_WS_Roles
  Admin --> UC_Board_Create
  Admin --> UC_Board_Members

  User --> UC_Board_Join
  User --> UC_Lists
  User --> UC_Cards
  User --> UC_Card_Detail
  User --> UC_Attach
  User --> UC_Chat
  User --> UC_Reminder
  User --> UC_Analytics

  Worker --> UC_Worker_Reminder
  Worker --> UC_Worker_Analytics

  UC_Worker_Reminder ..> UC_Reminder : consumes jobs
  UC_Worker_Analytics ..> UC_Analytics : builds stats
```

## Mapping nhanh use case → màn hình UI
- Home: UC_WS_List
- Workspace: UC_WS_Create, UC_WS_Invite
- Workspace member: UC_WS_Roles
- Board: UC_Lists, UC_Cards
- Board member: UC_Board_Members
- Dialog accept lời mời: UC_WS_Accept
- Card detail: UC_Card_Detail, UC_Attach, UC_Reminder
- Thống kê: UC_Analytics
- Profile: (nằm trong nhóm User settings; tuỳ cách triển khai)
- Chat panel: UC_Chat
