export const fallbackLog = (level: string, ...args: any[]): void => {
  try {
    const timestamp = new Date().toISOString();
    const message = args
      .map((a) => {
        if (a instanceof Error) return `${a.message}\n${a.stack}`;
        if (typeof a === 'object' && a !== null) {
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        }
        return String(a);
      })
      .join(' ');
    process.stderr.write(
      `[${timestamp}] [${level.toUpperCase()}] [FALLBACK] ${message}\n`
    );
  } catch {
    /* nothing more we can do */
  }
};

export const logLoggingFailure = (error: unknown, context: string): void => {
  fallbackLog(
    'error',
    `Logging failed in ${context}:`,
    error instanceof Error ? error.message : String(error)
  );
};
