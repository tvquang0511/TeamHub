# TeamHub Postman Collections (Modular)

This folder contains **multiple small Postman collections** (1 per module), to keep things manageable as the API grows.

## Files

Import these collections:

- `TeamHub - 00 Auth.postman_collection.json`
- `TeamHub - 10 Workspaces.postman_collection.json`
- `TeamHub - 20 Invites.postman_collection.json`
- `TeamHub - 30 Boards.postman_collection.json`
- `TeamHub - 40 Lists.postman_collection.json`
- `TeamHub - 50 Cards.postman_collection.json`

## Import order (recommended)

1. Import **all collections** above (Postman will create multiple collections).
2. Create a Postman **Environment** (recommended) or use each collection’s variables.

Recommended import/run order:

1) **Auth**
- Register
- Login (captures `accessToken`, `refreshToken`)

2) **Workspaces**
- Create workspace (captures `workspaceId`)

3) **Boards**
- Create board (captures `boardId`)

4) **Lists**
- Create list (captures `listId`)

5) **Cards**
- Create card (captures `cardId`)

6) **Invites**
- Create invite (captures `inviteToken`)
- Register/Login invited user (in Auth)
- Accept invite (in Invites)

## Variables used

These collections rely on these common variables:

- `baseUrl` (default: `http://localhost:4000/api`)
- `accessToken`, `refreshToken`
- `workspaceId`, `boardId`, `listId`, `cardId`
- `inviteEmail`, `invitePassword`, `inviteDisplayName`
- `inviteAccessToken`, `inviteRefreshToken`, `inviteToken`

### Note about where variables are stored

The requests capture IDs/tokens into **Collection Variables** (per collection).

If you prefer a single shared state across all collections, use a Postman **Environment** and change the scripts to `pm.environment.set(...)`.

(If you want, I can do that refactor for you.)
