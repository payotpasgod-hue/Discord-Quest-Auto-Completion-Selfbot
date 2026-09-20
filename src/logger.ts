const COLORS = {
  reset: '\u001b[0m',
  gray: '\u001b[90m',
  blue: '\u001b[34m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  red: '\u001b[31m',
} as const;

type LogLevel = 'info' | 'success' | 'warn' | 'error';

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }
  return String(error ?? 'Unknown error');
}

function write(level: LogLevel, message: string, error?: unknown): void {
  const color = {
    info: COLORS.blue,
    success: COLORS.green,
    warn: COLORS.yellow,
    error: COLORS.red,
  }[level];

  const suffix = error === undefined ? '' : `: ${formatError(error)}`;
  console.log(
    `${COLORS.gray}${new Date().toISOString()}${COLORS.reset} ${color}[${level.toUpperCase()}]${COLORS.reset} ${message}${suffix}`,
  );
}

export const logger = {
  info: (message: string) => write('info', message),
  success: (message: string) => write('success', message),
  warn: (message: string, error?: unknown) => write('warn', message, error),
  error: (message: string, error?: unknown) => write('error', message, error),
  formatError,
};
