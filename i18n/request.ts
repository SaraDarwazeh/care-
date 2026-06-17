import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { DEFAULT_LOCALE, LOCALES } from "./config";

// Every JSON file under messages/{locale}/ becomes a top-level namespace.
// Adding a new namespace is a one-file change (create the JSON pair) —
// no edits to this loader. Keep the list explicit so a missing file
// fails the build instead of silently producing untranslated keys.
//
// HMR note: the dynamic import path below interpolates two variables
// (`${locale}/${ns}`), which Turbopack/webpack treat as a dependency
// pattern rather than a single module. JSON edits don't always
// invalidate the cached promise — if you add a key to a JSON file and
// the dev server still reports MISSING_MESSAGE, save this file (or
// touch it) to force the request config to re-evaluate.
const NAMESPACES = [
  "common",
  "nav",
  "footer",
  "home",
  "services",
  "community",
  "auth",
  "legal",
  "patient",
  "nurse",
  "admin",
  "notifications",
  "errors",
  "rewards",
  "educationLibrary",
  "conditions",
  "findCare",
  "provider",
] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(LOCALES, requested) ? requested : DEFAULT_LOCALE;

  const loaded = await Promise.all(
    NAMESPACES.map((ns) =>
      import(`../messages/${locale}/${ns}.json`).then((m) => [ns, m.default] as const),
    ),
  );

  return {
    locale,
    messages: Object.fromEntries(loaded),
  };
});
