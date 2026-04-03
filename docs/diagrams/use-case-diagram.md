# Use case diagram

Use case diagram dưới đây mô tả các tác nhân chính và nhóm chức năng cốt lõi của TeamHub.

> Gợi ý: GitHub Markdown render được Mermaid. Nếu nơi bạn xem không render, hãy copy block `mermaid` sang công cụ Mermaid Live Editor.

```mermaid
flowchart LR
  Guest[Guest]
  User[User]
  Admin["Workspace Owner/Admin"]
  Worker[Worker]

  subgraph TeamHub
    UC_Auth([Register/Login/Logout])
    UC_Refresh([Refresh token])
    UC_Reset([Forgot/Reset password])

    UC_WS_List([View my workspaces])
    UC_WS_Create([Create workspace])
    UC_WS_Invite([Invite member])
    UC_WS_Accept([Accept invite])
    UC_WS_Roles([Manage workspace members/roles])

    UC_Board_Create([Create board])
    UC_Board_Join([Join board])
    UC_Board_Members([Manage board members])

    UC_Lists([Create/rename/reorder lists])
    UC_Cards([Create/update/move cards])
    UC_Card_Detail([Card detail: labels/assignees/checklists/comments])
    UC_Attach([Attachments: upload & preview])

    UC_Chat([Board chat realtime])

    UC_Reminder([Set/cancel reminder])
    UC_Worker_Reminder([Send reminder emails])

    UC_Analytics([View analytics/statistics])
    UC_Worker_Analytics([Run analytics jobs])
  end

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

  UC_Worker_Reminder -.-> UC_Reminder
  UC_Worker_Analytics -.-> UC_Analytics
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
