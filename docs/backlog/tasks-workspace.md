# Tasks — Workspace & Membership

## Stories / Tasks
1. DB: workspaces, workspace_members, workspace_invites
2. Create workspace
   - create workspace + membership OWNER
3. List my workspaces
4. Workspace detail + member list
5. Invite member via email
   - owner/admin only
   - token unique + expiresAt
   - email send (can mock in dev)
6. Accept invite
   - validate token not expired/accepted
   - create membership MEMBER
   - set acceptedAt
7. Role management (optional)
   - ensure at least 1 OWNER remains

## Acceptance criteria
- Non-member cannot access workspace data
- Invite token one-time use