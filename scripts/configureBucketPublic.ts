/**
 * One-shot helper: configure the S3 bucket so uploaded objects can be
 * read publicly via their virtual-hosted URL.
 *
 * Steps:
 *   1. Disable PublicAccessBlock (the bucket-level guard that overrides
 *      any policy).
 *   2. Put a bucket policy allowing s3:GetObject for anyone.
 *
 * Idempotent — safe to re-run.
 *
 * Run: npx tsx scripts/configureBucketPublic.ts
 */

import fs from "fs";
import path from "path";
import {
  S3Client,
  GetBucketPolicyCommand,
  PutBucketPolicyCommand,
  PutPublicAccessBlockCommand,
  GetPublicAccessBlockCommand,
} from "@aws-sdk/client-s3";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    if (!line || line.trim().startsWith("#")) return;
    const eq = line.indexOf("=");
    if (eq < 0) return;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  });
}

async function main() {
  loadEnvLocal();
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    console.error("AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY all required");
    process.exit(1);
  }

  const s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });

  console.log(`[configure] Disabling PublicAccessBlock on ${bucket}…`);
  await s3.send(
    new PutPublicAccessBlockCommand({
      Bucket: bucket,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        IgnorePublicAcls: false,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      },
    }),
  );

  // Verify the change landed (the API is sometimes lazy).
  const verify = await s3.send(new GetPublicAccessBlockCommand({ Bucket: bucket }));
  console.log("[configure] PublicAccessBlock now:", verify.PublicAccessBlockConfiguration);

  // Explicit allow-list of public prefixes. Anything NOT listed here
  // (currently: patients/ids/*) is implicitly private and only readable
  // via short-lived signed URLs minted by /api/uploads/read.
  //
  // nurses/certificates/* stays in the allow-list for backwards compat
  // with existing certificate URLs; migrating those to signed reads is
  // a separate follow-up so we don't break the admin nurses page.
  const PUBLIC_PREFIXES = [
    "community/*",
    "nurses/profile/*",
    "nurses/gallery/*",
    "nurses/certificates/*",
    "packages/*",
    "products/*",
  ];

  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "PublicReadGetObject",
        Effect: "Allow",
        Principal: "*",
        Action: ["s3:GetObject"],
        Resource: PUBLIC_PREFIXES.map((p) => `arn:aws:s3:::${bucket}/${p}`),
      },
    ],
  };

  console.log(`[configure] Putting public-read policy…`);
  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify(policy),
    }),
  );

  const got = await s3.send(new GetBucketPolicyCommand({ Bucket: bucket }));
  console.log("[configure] Policy:", got.Policy);
  console.log(`[configure] Done. Objects under https://${bucket}.s3.${region}.amazonaws.com/ are now publicly readable.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
