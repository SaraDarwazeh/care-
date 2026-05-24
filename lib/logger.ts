// Thin logging wrapper used by services + API routes.
//
// Behavior:
// - error: always logged (production + dev).
// - warn: always logged.
// - info / debug: logged only when NODE_ENV !== "production".
//
// Each log line is prefixed with the scope passed in createLogger so a grep
// against production logs can quickly locate the source service.
//
// This intentionally stays a thin wrapper. If we add Sentry / Datadog later,
// it plugs in here without touching call sites.

type LogArg = unknown;

export interface Logger {
  debug: (...args: LogArg[]) => void;
  info: (...args: LogArg[]) => void;
  warn: (...args: LogArg[]) => void;
  error: (...args: LogArg[]) => void;
}

function isProduction(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV === "production";
}

export function createLogger(scope: string): Logger {
  const tag = `[${scope}]`;
  const verbose = !isProduction();

  return {
    debug: (...args: LogArg[]) => {
      if (verbose) console.debug(tag, ...args);
    },
    info: (...args: LogArg[]) => {
      if (verbose) console.info(tag, ...args);
    },
    warn: (...args: LogArg[]) => {
      console.warn(tag, ...args);
    },
    error: (...args: LogArg[]) => {
      console.error(tag, ...args);
    },
  };
}

// Default logger for ad-hoc use; prefer createLogger("scope") in services.
export const logger: Logger = createLogger("app");
