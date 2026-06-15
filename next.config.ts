import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Hosts whose images we allow next/image to load. Every Image render today
// passes `unoptimized`, but the allowlist is the long-term backstop in case
// we ever drop that prop. AWS_S3_BUCKET + AWS_REGION are read at build time.
const s3Host = process.env.AWS_S3_BUCKET && process.env.AWS_REGION
  ? `${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`
  : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      ...(s3Host ? [{ protocol: "https" as const, hostname: s3Host }] : []),
    ],
  },
};

export default withNextIntl(nextConfig);
