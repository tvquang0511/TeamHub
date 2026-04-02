# Error Codes & Response Format

## 1) Standard error response
```json
{
  "error": {
    "code": "SOME_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

## 2) Suggested error codes
### Auth
- `AUTH_INVALID_CREDENTIALS` (401)
- `AUTH_TOKEN_EXPIRED` (401)
- `AUTH_TOKEN_INVALID` (401)
- `AUTH_REFRESH_REVOKED` (401)
- `AUTH_EMAIL_EXISTS` (409)
- `AUTH_RESET_TOKEN_INVALID` (400)

### Workspace / Membership
- `WORKSPACE_NOT_FOUND` (404)
- `WORKSPACE_FORBIDDEN` (403)
- `WORKSPACE_INVITE_EXPIRED` (400)
- `WORKSPACE_INVITE_INVALID` (400)
- `WORKSPACE_ALREADY_MEMBER` (409)
- `WORKSPACE_ROLE_INVALID` (400)
- `WORKSPACE_OWNER_REQUIRED` (400)

### Kanban
- `BOARD_NOT_FOUND` (404)
- `LIST_NOT_FOUND` (404)
- `CARD_NOT_FOUND` (404)
- `POSITION_INVALID_CONTEXT` (400)  # prev/next mismatch, not in same list, etc.

### Chat
- `CHAT_CONTENT_EMPTY` (400)
- `CHAT_RATE_LIMITED` (429)

### Reminder
- `REMINDER_TIME_IN_PAST` (400)
- `REMINDER_DUPLICATE` (409)
- `REMINDER_NOT_FOUND` (404)

## 3) Validation errors
For schema validation (Zod/Joi), recommend:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": {
      "fields": [
        { "path": "email", "message": "Invalid email" }
      ]
    }
  }
}
```

## 4) Notes
- Always return 401 for missing/invalid access token.
- Return 403 when token is valid but user lacks permission (not a workspace member).
- Use 409 for duplicates / conflicts.