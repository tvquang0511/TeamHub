import type { PoolClient } from 'pg';

import { env } from '../../config/env';
import { listObjects, removeObjectSafe } from '../../integrations/storage/minio';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function parseObjectKeyFromPublicUrl(url: string | null | undefined): { bucket: string; objectKey: string } | null {
  if (!url) return null;
  // Expected formats (examples):
  // - http://localhost:9000/teamhub-public/avatars/123?v=...
  // - https://cdn.example.com/teamhub-public/workspace-backgrounds/456?v=...
  // We only care about extracting '/<bucket>/<objectKey>'.
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/+/, '');
    const [bucket, ...rest] = path.split('/');
    if (!bucket || rest.length === 0) return null;
    return { bucket, objectKey: rest.join('/') };
  } catch {
    return null;
  }
}

export async function sweepOrphanObjects(client: PoolClient) {
  const now = Date.now();
  const orphanGraceMs = env.BLOB_SWEEP_ORPHAN_GRACE_DAYS * MS_PER_DAY;
  const chatUnlinkedMs = env.BLOB_SWEEP_CHAT_UNLINKED_HOURS * MS_PER_HOUR;

  const referenced = new Set<string>();

  // Attachments (authoritative because they store bucket + object_key)
  {
    const res = await client.query<{
      bucket: string;
      object_key: string;
    }>(
      `
      select bucket, object_key
      from card_attachments
      where bucket is not null and object_key is not null
      union
      select bucket, object_key
      from board_message_attachments
      where bucket is not null and object_key is not null
      `
    );

    for (const row of res.rows) {
      referenced.add(`${row.bucket}/${row.object_key}`);
    }
  }

  // Users/workspaces store only URLs; parse best-effort.
  {
    const [users, workspaces] = await Promise.all([
      client.query<{ avatar_url: string | null }>('select avatar_url from users where avatar_url is not null'),
      client.query<{ background_image_url: string | null }>(
        'select background_image_url from workspaces where background_image_url is not null'
      ),
    ]);

    for (const row of users.rows) {
      const parsed = parseObjectKeyFromPublicUrl(row.avatar_url);
      if (parsed) referenced.add(`${parsed.bucket}/${parsed.objectKey}`);
    }

    for (const row of workspaces.rows) {
      const parsed = parseObjectKeyFromPublicUrl(row.background_image_url);
      if (parsed) referenced.add(`${parsed.bucket}/${parsed.objectKey}`);
    }
  }

  // List objects in the buckets we manage.
  const buckets = [env.MINIO_BUCKET, env.MINIO_BUCKET_PUBLIC];

  const candidates: Array<{ bucket: string; objectKey: string; lastModified?: Date }> = [];
  for (const bucket of buckets) {
    const objects = await listObjects(bucket);
    for (const obj of objects) {
      // Skip tmp/ because lifecycle can handle it; sweeper is a backstop.
      if (obj.name.startsWith('tmp/')) continue;
      candidates.push({
        bucket,
        objectKey: obj.name,
        ...(obj.lastModified ? { lastModified: obj.lastModified } : {}),
      });
    }
  }

  // Delete objects not referenced and older than grace.
  let deletedOrphans = 0;
  for (const obj of candidates) {
    const key = `${obj.bucket}/${obj.objectKey}`;
    if (referenced.has(key)) continue;

    const lastModifiedMs = obj.lastModified?.getTime();
    if (!lastModifiedMs) continue;
    if (now - lastModifiedMs < orphanGraceMs) continue;

    await removeObjectSafe(obj.bucket, obj.objectKey);
    deletedOrphans++;
  }

  // Also cleanup unlinked chat attachments (DB rows removed but object might linger).
  // We keep rows for linked attachments; the earlier backend flow deletes rows first.
  // Here we only delete object for rows whose message no longer exists, and older than threshold.
  let deletedChatUnlinked = 0;
  {
    const res = await client.query<{
      id: string;
      bucket: string;
      object_key: string;
      created_at: Date;
    }>(
      `
      select a.id, a.bucket, a.object_key, a.created_at
      from board_message_attachments a
      left join board_messages m on m.id = a.message_id
      where m.id is null
      `
    );

    const deletedRowIds: string[] = [];

    for (const row of res.rows) {
      if (now - row.created_at.getTime() < chatUnlinkedMs) continue;
      await removeObjectSafe(row.bucket, row.object_key);
      deletedChatUnlinked++;
      deletedRowIds.push(row.id);
    }

    if (deletedRowIds.length > 0) {
      await client.query('delete from board_message_attachments where id = any($1::uuid[])', [deletedRowIds]);
    }
  }

  return {
    referencedCount: referenced.size,
    scannedCount: candidates.length,
    deletedOrphans,
    deletedChatUnlinked,
  };
}
