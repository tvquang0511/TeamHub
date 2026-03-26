import crypto from "crypto";

// Minimal presign implementation for S3-compatible (MinIO) using AWS Signature V4.
// This presign is for GET object.

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

export type PresignedGetResult = {
  downloadUrl: string;
  method: "GET";
  bucket: string;
  objectKey: string;
  expiresIn: number;
};

export function presignGetObject(params: {
  endpoint: string; // e.g. http://localhost:9000
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  objectKey: string;
  expiresInSeconds?: number;
}): PresignedGetResult {
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

  const canonicalUri = `/${encodeURIComponent(params.bucket)}/${params.objectKey
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

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
    "GET",
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

  const downloadUrl = `${endpointUrl.protocol}//${host}${canonicalUri}?${finalQueryString}`;

  return {
    downloadUrl,
    method: "GET",
    bucket: params.bucket,
    objectKey: params.objectKey,
    expiresIn,
  };
}
