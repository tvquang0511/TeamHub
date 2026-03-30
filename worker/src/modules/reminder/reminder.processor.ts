import type { PoolClient } from 'pg';

import { sendReminderEmail } from '../../mail/mailer';

export async function processReminderJob(client: PoolClient, reminderJobId: string) {
  await client.query('BEGIN');

  try {
    const rowResult = await client.query<{
      id: string;
      status: 'PENDING' | 'SENT' | 'CANCELED' | 'FAILED';
      remind_at: Date;

      user_email: string;
      card_title: string;
      card_due_at: Date | null;
      board_name: string;
      workspace_name: string;
    }>(
      `SELECT
         rj.id,
         rj.status,
         rj.remind_at,
         u.email AS user_email,
         c.title AS card_title,
         c.due_at AS card_due_at,
         b.name AS board_name,
         w.name AS workspace_name
       FROM reminder_jobs rj
       JOIN users u ON u.id = rj.user_id
       JOIN cards c ON c.id = rj.card_id
       JOIN lists l ON l.id = c.list_id
       JOIN boards b ON b.id = l.board_id
       JOIN workspaces w ON w.id = b.workspace_id
       WHERE rj.id = $1
       FOR UPDATE`,
      [reminderJobId],
    );

    const row = rowResult.rows[0];

    if (!row) {
      await client.query('COMMIT');
      return;
    }

    if (row.status !== 'PENDING') {
      await client.query('COMMIT');
      return;
    }

    // Send email while holding row lock to avoid duplicate sends.
    await sendReminderEmail({
      to: row.user_email,
      workspaceName: row.workspace_name,
      boardName: row.board_name,
      cardTitle: row.card_title,
      dueAt: row.card_due_at,
    });

    await client.query(
      `UPDATE reminder_jobs
       SET status = 'SENT',
           attempts = attempts + 1,
           last_error = NULL,
           sent_at = NOW()
       WHERE id = $1 AND status = 'PENDING'`,
      [reminderJobId],
    );

    await client.query('COMMIT');
  } catch (err: any) {
    const message = String(err?.message ?? err);

    try {
      await client.query(
        `UPDATE reminder_jobs
         SET status = 'FAILED',
             attempts = attempts + 1,
             last_error = $2
         WHERE id = $1 AND status = 'PENDING'`,
        [reminderJobId, message.slice(0, 2000)],
      );
      await client.query('COMMIT');
    } catch {
      await client.query('ROLLBACK');
    }

    throw err;
  }
}
