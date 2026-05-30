// Translate Firebase Auth (and other thrown) errors into user-facing copy.
// The hook-based caller passes its root-scope translator; locale resolution
// is implicit in the translator's binding, so this module stays framework-free.

type Translator = (key: string, values?: Record<string, string | number>) => string;

// Firebase error codes look like `auth/wrong-password`. Strip the prefix
// to get the leaf key the `errors.auth.*` catalog uses.
function authCodeKey(code: string): string {
  const trimmed = code.startsWith("auth/") ? code.slice(5) : code;
  return trimmed.toLowerCase();
}

function tryT(t: Translator, key: string): string | null {
  try {
    const out = t(key);
    // next-intl returns the key path verbatim when missing — treat that as
    // a miss so we fall through to the generic message.
    return out && out !== key ? out : null;
  } catch {
    return null;
  }
}

// Translation-aware error normalizer. Use from hook-based code paths:
//
//   const tRoot = useTranslations();
//   setError(getLocalizedErrorMessage(err, tRoot));
//
// Falls back to errors.generic when the code is unknown.
export function getLocalizedErrorMessage(error: unknown, t: Translator): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: unknown }).code ?? "");
    if (code) {
      const localized = tryT(t, `errors.auth.${authCodeKey(code)}`);
      if (localized) return localized;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  const generic = tryT(t, "errors.generic");
  return generic ?? "Something went wrong. Please try again.";
}

// Legacy passthrough — kept so existing callers compile while we migrate.
// Prefer getLocalizedErrorMessage in new code.
export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
