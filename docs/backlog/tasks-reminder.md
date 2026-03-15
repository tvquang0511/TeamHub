# Tasks — Reminder (SMTP)

## Model
- reminder_jobs: per-user reminders
- statuses: PENDING, SENT, CANCELED, FAILED
- retry attempts up to 5

## API tasks
1. PUT /cards/:cid/reminders
   - validate remindAt > now
   - prevent duplicate (cardId,userId,remindAt)
2. DELETE /cards/:cid/reminders/:reminderJobId
   - set status CANCELED
3. GET /cards/:cid/reminders (for current user)
   - list reminders on this card set by this user

## Worker tasks
1. Poll each 60s:
   - query jobs: status=PENDING AND remindAt<=now limit N
2. Send SMTP:
   - subject `[TeamHub] Nhắc nhở: {card.title}`
   - body includes board name, due date, link to card
3. Update in transaction:
   - set status SENT, sentAt
4. On error:
   - attempts++
   - lastError
   - if attempts > 5 => FAILED

## Acceptance criteria
- Reminder email sent once
- Restart worker does not lose jobs
- Failed SMTP retries as spec