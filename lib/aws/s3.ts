import { S3Client } from "@aws-sdk/client-s3";

// Server-only S3 client. Lazily initialized so missing env vars at build
// time don't crash the module — instead, callers get a clear error at the
// boundary that knows they need real credentials.

let cachedClient: S3Client | null = null;

export function getS3Bucket(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error("AWS_S3_BUCKET is not configured");
  }
  return bucket;
}

export function getS3Region(): string {
  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error("AWS_REGION is not configured");
  }
  return region;
}

export function getS3Client(): S3Client {
  if (cachedClient) return cachedClient;

  const region = getS3Region();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set to use S3 uploads",
    );
  }

  cachedClient = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

// Public base URL for finished uploads. Defaults to the standard
// virtual-hosted-style S3 URL if no CDN/custom domain is provided.
export function getPublicBaseUrl(): string {
  const override = process.env.NEXT_PUBLIC_AWS_S3_PUBLIC_BASE_URL;
  if (override) return override.replace(/\/$/, "");
  const bucket = getS3Bucket();
  const region = getS3Region();
  return `https://${bucket}.s3.${region}.amazonaws.com`;
}

export function buildPublicUrl(key: string): string {
  return `${getPublicBaseUrl()}/${key}`;
}
