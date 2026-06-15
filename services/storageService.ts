import { getCurrentIdToken } from "@/services/authService";

export type UploadScope =
  | "community"
  | "nurse-profile"
  | "nurse-gallery"
  | "nurse-certificate"
  | "package"
  | "product"
  | "patient-id";

export interface UploadResult {
  // Empty for private scopes (patient-id) — callers should store `key`
  // and fetch a signed read URL on demand.
  url: string;
  key: string;
}

interface PresignResponse {
  uploadUrl: string;
  // Undefined for private scopes.
  publicUrl?: string;
  key: string;
  expiresIn: number;
}

interface PresignErrorResponse {
  error?: string;
}

// Client-side upload entry point. Two-step protocol:
//   1. POST /api/uploads/presign with file metadata. Server validates the
//      caller's role for the chosen scope and returns a short-lived PUT URL.
//   2. PUT the file bytes directly to S3 against that URL. The Content-Type
//      header must match what we declared in step 1.
//
// Returning { url, key } so callers can store the public URL and later
// optionally delete by key. No PII or auth tokens leak to S3 — the only
// thing the bucket sees is the bytes.
export async function uploadFile(
  file: File,
  options: { scope: UploadScope },
): Promise<UploadResult> {
  const token = await getCurrentIdToken();
  if (!token) {
    throw new Error("You must be signed in to upload files.");
  }

  const presignRes = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      scope: options.scope,
    }),
  });

  if (!presignRes.ok) {
    const payload = (await presignRes.json().catch(() => ({}))) as PresignErrorResponse;
    throw new Error(payload.error ?? `Failed to prepare upload (HTTP ${presignRes.status})`);
  }

  const { uploadUrl, publicUrl, key } = (await presignRes.json()) as PresignResponse;

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(`Upload failed (HTTP ${putRes.status})`);
  }

  return { url: publicUrl ?? "", key };
}

// Fetch a short-lived signed read URL for objects in private prefixes
// (patient IDs). Public prefixes never need this — read them directly.
export async function fetchSignedReadUrl(key: string): Promise<string> {
  const token = await getCurrentIdToken();
  if (!token) {
    throw new Error("You must be signed in to view this document.");
  }
  const res = await fetch(`/api/uploads/read?key=${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `Failed to fetch document (HTTP ${res.status})`);
  }
  const data = (await res.json()) as { url: string; expiresIn: number };
  return data.url;
}

// Convenience helper for components that accept either a File or an
// already-pasted URL. If `input` is a string, return it as-is; otherwise
// run the full upload.
export async function uploadOrPassThrough(
  input: File | string,
  options: { scope: UploadScope },
): Promise<string> {
  if (typeof input === "string") return input;
  const { url } = await uploadFile(input, options);
  return url;
}
