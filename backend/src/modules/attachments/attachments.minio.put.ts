import crypto from "crypto";

// Minimal presign implementation for S3-compatible (MinIO) using AWS Signature V4.
// We avoid external deps to keep the backend lightweight.
// This presign is for PUT object.

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

export type PresignedPutResult = {
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  bucket: string;
  objectKey: string;
  url: string; // public/base url (not signed), useful for storing
  expiresIn: number;
};

export function presignPutObject(params: {
  endpoint: string; // e.g. http://localhost:9000
  accessKeyId: string;
  secretAccessKey: string;
  region: string; // MinIO ignores but SigV4 needs a value
  bucket: string;
  objectKey: string;
  contentType: string;
  expiresInSeconds?: number;
}): PresignedPutResult {
  const expiresIn = params.expiresInSeconds ?? 300;

  const now = new Date();
  const amzDate = now
    .toISOString()
    .replace(/[:-]|\.[0-9]{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);

  const service = "s3";
  const credentialScope = `${dateStamp}/${params.region}/${service}/aws4_request`;
  const signedHeaders = "host";

  const endpointUrl = new URL(params.endpoint);
  const host = endpointUrl.host;

  // Use path-style: /bucket/object
  const canonicalUri = `/${encodeURIComponent(params.bucket)}/${params.objectKey
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  // We use unsigned payload for presigned URL (typical for S3 presign).
  const canonicalQuery: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${params.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": signedHeaders,
  };

  const canonicalQueryString = Object.keys(canonicalQuery)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(canonicalQuery[k]!)}`)
    .join("&");

  const canonicalHeaders = `host:${host}\n`;
  const payloadHash = "UNSIGNED-PAYLOAD";
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = getSigningKey(params.secretAccessKey, dateStamp, params.region, service);
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  const finalQueryString = `${canonicalQueryString}&X-Amz-Signature=${signature}`;

  const uploadUrl = `${endpointUrl.protocol}//${host}${canonicalUri}?${finalQueryString}`;

  const baseUrl = `${endpointUrl.protocol}//${host}${canonicalUri}`;

  return {
    uploadUrl,
    method: "PUT",
    headers: {
      "Content-Type": params.contentType,
    },
    bucket: params.bucket,
    objectKey: params.objectKey,
    url: baseUrl,
    expiresIn,
  };
}
