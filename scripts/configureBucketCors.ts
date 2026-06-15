/**
 * One-shot helper: configure CORS on the S3 bucket so browser PUT/GET
 * requests from our dev + prod origins succeed.
 *
 * Without this, an OPTIONS preflight from http://localhost:3000 (or the
 * deployed origin) returns no Access-Control-Allow-Origin and the
 * browser blocks the upload — even though a server-side PUT would work.
 *
 * Origins:
 *   - http://localhost:3000 (always — dev)
 *   - NEXT_PUBLIC_SITE_URL (when set in .env.local)
 *
 * Idempotent — safe to re-run.
 *
 * Run: npx tsx scripts/configureBucketCors.ts
 */

import fs from "fs";
import path from "path";
import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
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

  const origins = ["http://localhost:3000"];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (siteUrl && siteUrl !== "https://careplus.example.com") {
    origins.push(siteUrl);
  }

  const s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });

  console.log(`[configure] Setting CORS on ${bucket}…`);
  console.log(`[configure] AllowedOrigins: ${origins.join(", ")}`);

  await s3.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: origins,
            AllowedMethods: ["PUT", "GET", "HEAD"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    }),
  );

  const verify = await s3.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.log("[configure] CORSRules now:", JSON.stringify(verify.CORSRules, null, 2));
  console.log("[configure] Done. Browser PUTs from the listed origins should now succeed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
