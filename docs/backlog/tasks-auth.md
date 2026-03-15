# Tasks — Auth

## Objectives
Implement JWT access token + refresh token stored hashed in DB.

## Stories / Tasks
1. DB: users, refresh_tokens schema + migrations
2. Register API
   - validate email unique
   - bcrypt hash
3. Login API
   - verify password
   - issue access + refresh
   - store refresh hash in DB
4. Refresh API
   - validate refresh token
   - rotate token (recommended)
   - revoke old token
5. Logout API
   - revoke refresh token
6. Middleware `authJwt`
   - parse Authorization header
   - verify access token
   - attach req.user
7. Tests / scenarios
   - wrong password
   - revoked refresh
   - expired refresh

## Acceptance criteria
- Access token expires (short)
- Refresh token can be revoked
- `/me` works with valid access token