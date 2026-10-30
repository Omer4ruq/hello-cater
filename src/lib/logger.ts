/**
 * Structured logging.
 *
 * Emits single-line JSON in production so Vercel/Sentry can parse it, and
 * readable text in development. Keys named like secrets are redacted
 * before anything is written.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE = /(password|secret|token|api[_-]?key|authorization|service_role|signature|card)/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[depth-limit]';
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) =>
        SENSITIVE.test(k) ? [k, '[redacted]'] : [k, redact(v, depth + 1)],
      ),
    );
  }
  return value;
}

function emit(level: Level, message: string, context?: Record<string, unknown>) {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...(context ? (redact(context) as Record<string, unknown>) : {}),
  };

  if (process.env.NODE_ENV === 'production') {
    console[level === 'debug' ? 'log' : level](JSON.stringify(payload));
    return;
  }
  console[level === 'debug' ? 'log' : level](
    `[${level}] ${message}`,
    context ? redact(context) : '',
  );
}

export const logger = {
  debug: (m: string, c?: Record<string, unknown>) =>
    process.env.NODE_ENV !== 'production' && emit('debug', m, c),
  info: (m: string, c?: Record<string, unknown>) => emit('info', m, c),
  warn: (m: string, c?: Record<string, unknown>) => emit('warn', m, c),
  error: (m: string, c?: Record<string, unknown>) => emit('error', m, c),
};
