import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
    // Disable AWS SDK v3's auto-checksum middleware. As of
    // @aws-sdk/client-s3 ~3.730+ the SDK defaults to
    // requestChecksumCalculation: "WHEN_SUPPORTED", which adds an
    // x-amz-checksum-crc32 header into the *signed* PutObject URL.
    // The browser's plain fetch() PUT never sends that header → S3
    // rejects with 403 SignatureDoesNotMatch. Switching to
    // WHEN_REQUIRED restores the pre-3.730 behaviour where only
    // explicitly-requested checksums are signed. The bucket CORS is
    // unaffected and needs no console change.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
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

// Short-lived signed read URL for objects in private prefixes (e.g.
// patients/ids/*). Default TTL is 5 minutes — long enough for the admin
// UI or patient editor to load the image; short enough that a leaked
// URL stops working quickly.
export async function getSignedReadUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({ Bucket: getS3Bucket(), Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
