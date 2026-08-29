import env from "../../config/env";

export * from "./minio.presign.put";
export * from "./minio.presign.get";

export function buildPublicStorageUrl(bucket: string, objectKey: string): string {
  const provider = env.STORAGE_PROVIDER;
  const endpoint = env.STORAGE_ENDPOINT;
  const cleanEndpoint = endpoint.replace(/\/+$/, "");
  const encodedObjectKey = objectKey.split("/").map(encodeURIComponent).join("/");

  if (provider === "supabase") {
    // Extract project ref from endpoint (e.g. https://hqtnfzpibofamwgxhfip.storage.supabase.co/storage/v1/s3)
    const match = cleanEndpoint.match(/https:\/\/([a-z0-9-]+)\.storage\.supabase\.co/i);
    if (match && match[1]) {
      const projectRef = match[1];
      return `https://${projectRef}.supabase.co/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedObjectKey}`;
    }
  }

  return `${cleanEndpoint}/${encodeURIComponent(bucket)}/${encodedObjectKey}`;
}
