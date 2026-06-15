import Link from "next/link";

// App-root not-found. This catches any 404 that doesn't fall inside a
// locale segment — e.g. truly unmatched paths and any framework
// fallback. The locale-aware version lives at app/[locale]/not-found.tsx
// and renders when a request inside a locale path can't be matched.
//
// We keep this bilingual since we can't read the active locale here
// without per-locale routing context.
export default function RootNotFound() {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            'system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          margin: 0,
          padding: "0 20px",
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            padding: 32,
            borderRadius: 24,
            background: "#fff",
            boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
          }}
        >
          <h1 style={{ fontSize: 64, fontWeight: 800, margin: 0, color: "#0284c7" }}>404</h1>
          <p style={{ marginTop: 8, fontSize: 18, fontWeight: 600 }}>Page not found · الصفحة غير موجودة</p>
          <p style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>
            The page you were looking for has moved or never existed.
            <br />
            الصفحة التي تبحث عنها انتقلت أو لم تكن موجودة أصلًا.
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
            <Link
              href="/en"
              style={{
                background: "#0284c7",
                color: "#fff",
                padding: "10px 20px",
                borderRadius: 12,
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Go home (EN)
            </Link>
            <Link
              href="/ar"
              style={{
                background: "#fff",
                color: "#0f172a",
                border: "1px solid #e2e8f0",
                padding: "10px 20px",
                borderRadius: 12,
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              الرئيسية (AR)
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
