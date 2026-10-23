/**
 * Logger — the ONLY place app code should write to the console.
 *
 * In release builds (__DEV__ === false) every method is a no-op, so nothing the
 * user writes (journal notes, email, profile, tokens, raw errors) ever reaches
 * Android logcat (`adb logcat`), the browser DevTools console, or crash-log
 * collectors. In development everything is printed as usual.
 *
 * Rule of thumb: never pass user content to these, even in dev — log counts,
 * ids and error *types*, not notes or emails.
 */

/* eslint-disable no-console */
const enabled = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

type LogFn = (...args: unknown[]) => void;
const noop: LogFn = () => {};

export const logger: { debug: LogFn; info: LogFn; warn: LogFn; error: LogFn } = enabled
  ? {
      debug: (...a) => console.log(...a),
      info: (...a) => console.info(...a),
      warn: (...a) => console.warn(...a),
      error: (...a) => console.error(...a),
    }
  : { debug: noop, info: noop, warn: noop, error: noop };

/**
 * Belt-and-braces: in release builds also silence console.* globally, so a
 * stray console.log (ours or a library's) can't leak data either.
 */
export function silenceConsoleInRelease(): void {
  if (enabled) return;
  const c = console as unknown as Record<string, LogFn>;
  for (const k of ['log', 'info', 'debug', 'warn', 'error', 'trace', 'table', 'dir']) {
    c[k] = noop;
  }
}

/** A short, non-sensitive description of an error for user-facing messages. */
export function safeErrorMessage(_err: unknown, fallback: string): string {
  // Never surface raw error text in release builds: it can contain SQL, file
  // paths, tokens or server internals. Dev builds show the real message.
  if (enabled && _err instanceof Error) return `${fallback}\n\n[dev] ${_err.message}`;
  return fallback;
}
