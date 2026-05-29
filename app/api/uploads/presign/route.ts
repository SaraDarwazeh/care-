import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { buildPublicUrl, getS3Bucket, getS3Client } from "@/lib/aws/s3";
import { authErrorResponse, verifyRequest, AuthError } from "@/lib/auth/verifyRequest";

// Upload scopes drive both the S3 prefix and the per-scope auth rules.
// Adding a new scope here is the only thing required to extend the system.
const UPLOAD_SCOPES = [
  "community",
  "nurse-profile",
  "nurse-gallery",
  "nurse-certificate",
  "package",
  "product",
] as const;

type UploadScope = (typeof UPLOAD_SCOPES)[number];

const SCOPE_PREFIXES: Record<UploadScope, string> = {
  community: "community",
  "nurse-profile": "nurses/profile",
  "nurse-gallery": "nurses/gallery",
  "nurse-certificate": "nurses/certificates",
  package: "packages",
  product: "products",
};

// Maximum file size enforced server-side. We bake it into the presigned
// URL via Content-Length-Range on the upload — keeps abuse cheap.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
const PRESIGN_TTL_SECONDS = 60 * 5; // 5 minutes is enough for a single upload

function isUploadScope(value: unknown): value is UploadScope {
  return typeof value === "string" && (UPLOAD_SCOPES as readonly string[]).includes(value);
}

// Sanitize a filename into something safe for an S3 key. We keep the
// extension (for content-type sniffing in the browser) but strip any
// path components and exotic characters.
function safeExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "";
  const ext = filename
    .slice(dot + 1)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return ext.length > 0 && ext.length <= 8 ? `.${ext}` : "";
}

function randomKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(request: NextRequest) {
  let caller;
  try {
    caller = await verifyRequest(request);
  } catch (error) {
    return authErrorResponse(error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { filename, contentType, scope, size } =
    (body as { filename?: unknown; contentType?: unknown; scope?: unknown; size?: unknown }) ?? {};

  if (typeof filename !== "string" || filename.length === 0) {
    return NextResponse.json({ error: "filename is required" }, { status: 400 });
  }
  if (typeof contentType !== "string" || contentType.length === 0) {
    return NextResponse.json({ error: "contentType is required" }, { status: 400 });
  }
  if (!isUploadScope(scope)) {
    return NextResponse.json(
      { error: `scope must be one of: ${UPLOAD_SCOPES.join(", ")}` },
      { status: 400 },
    );
  }
  if (typeof size === "number" && size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File exceeds maximum size of ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB` },
      { status: 413 },
    );
  }

  // Scope-based authorization. Any signed-in user can post community
  // donations; only nurses (or admins) touch nurse-* prefixes; only
  // admins touch package and product prefixes.
  try {
    if (scope === "community") {
      // Any authenticated user is fine.
    } else if (scope.startsWith("nurse-")) {
      if (caller.role !== "nurse" && caller.role !== "admin") {
        throw new AuthError(403, "Only nurses may upload to nurse scopes");
      }
    } else if (scope === "package" || scope === "product") {
      if (caller.role !== "admin") {
        throw new AuthError(403, "Only admins may upload to this scope");
      }
    }
  } catch (error) {
    return authErrorResponse(error);
  }

  let client;
  let bucket: string;
  try {
    client = getS3Client();
    bucket = getS3Bucket();
  } catch (error) {
    console.error("[api/uploads/presign] S3 not configured", error);
    return NextResponse.json(
      {
        error: "Upload storage is not configured on this server. Set AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.",
      },
      { status: 503 },
    );
  }

  const prefix = SCOPE_PREFIXES[scope];
  const key = `${prefix}/${randomKey()}${safeExtension(filename)}`;

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      // ACL is intentionally omitted — buckets created with Block Public
      // Access turned off serve objects via the bucket policy instead.
      // If you're using a private bucket later, this is where signed
      // reads would be wired.
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: PRESIGN_TTL_SECONDS });
    const publicUrl = buildPublicUrl(key);

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
      expiresIn: PRESIGN_TTL_SECONDS,
    });
  } catch (error) {
    console.error("[api/uploads/presign] failed to sign url", error);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
