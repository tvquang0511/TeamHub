import { Client } from 'minio';

import { env } from '../../config/env';

function parseEndpoint(endpoint: string): { endPoint: string; port?: number; useSSL: boolean } {
  // Accept either:
  // - "http://localhost:9000"
  // - "https://minio.example.com"
  // - "localhost" (defaults to http)
  if (!endpoint.includes('://')) {
    return { endPoint: endpoint, useSSL: false };
  }

  const url = new URL(endpoint);
  const useSSL = url.protocol === 'https:';
  if (url.port) {
    return { endPoint: url.hostname, port: Number(url.port), useSSL };
  }
  return { endPoint: url.hostname, useSSL };
}

const endpoint = parseEndpoint(env.MINIO_ENDPOINT);

export const minio = new Client({
  endPoint: endpoint.endPoint,
  ...(endpoint.port ? { port: endpoint.port } : {}),
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
  useSSL: endpoint.useSSL,
});

export async function removeObjectSafe(bucket: string, objectKey: string) {
  // MinIO/S3 delete is idempotent; treat NotFound as success.
  try {
    await minio.removeObject(bucket, objectKey);
  } catch (error: any) {
    const code = error?.code || error?.name;
    if (code === 'NoSuchKey' || code === 'NotFound') return;
    throw error;
  }
}

export function listObjects(bucket: string, prefix?: string): Promise<Array<{ name: string; lastModified?: Date }>> {
  return new Promise((resolve, reject) => {
    const items: Array<{ name: string; lastModified?: Date }> = [];
    const stream = minio.listObjectsV2(bucket, prefix ?? '', true);

    stream.on('data', (obj: any) => {
      if (obj?.name) items.push({ name: obj.name, lastModified: obj.lastModified });
    });
    stream.on('error', reject);
    stream.on('end', () => resolve(items));
  });
}
