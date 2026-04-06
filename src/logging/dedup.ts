/**
 * Simple log deduplication: if the current message is identical to the
 * last one logged, skip it.  Errors are never skipped.
 *
 * Two integration points:
 * 1. `shouldLog()` — call before IPC messages reach electron-log
 * 2. `createFileHook()` — electron-log hook for main-process messages
 *    (file transport only, console stays verbose)
 *
 * Each integration point tracks its own last-key so they don't interfere.
 */
export class LogDeduplicator {
  /** Key of the last IPC message that was actually written */
  private lastIpcKey = '';

  /** Key of the last file-transport message that was actually written */
  private lastFileKey = '';

  /**
   * Build a dedup key from level + message text.
   * Strips dynamic numbers (timestamps, IDs) so messages that differ
   * only by a changing number still match.
   */
  private makeKey(level: string, args: any[]): string {
    const text = args
      .map((a) => {
        if (typeof a === 'string') return a;
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      })
      .join(' ')
      .replace(/\b\d{4,}\b/g, '#')
      .replace(/\b\d+\.\d+\b/g, '#');
    return `${level}|${text}`;
  }

  /**
   * Check whether an IPC message should be logged.
   * Returns false if it is identical to the last logged message.
   * Errors always return true.
   */
  shouldLog(level: string, contextStr: string, args: any[]): boolean {
    if (level === 'error') {
      this.lastIpcKey = '';
      return true;
    }

    const key = this.makeKey(level, [contextStr, ...args]);
    if (key === this.lastIpcKey) return false;

    this.lastIpcKey = key;
    return true;
  }

  /**
   * Electron-log hook for the file transport.
   * Suppresses consecutive duplicate non-error messages.
   * Console transport is unaffected.
   */
  createFileHook() {
    return (
      message: any,
      _transport: any,
      transportName?: string
    ): any | null => {
      if (transportName !== 'file') return message;
      if (!message) return message;
      if (message.level === 'error') {
        this.lastFileKey = '';
        return message;
      }

      const text =
        message.data
          ?.map((item: any) => {
            if (typeof item === 'string') return item;
            try {
              return JSON.stringify(item);
            } catch {
              return String(item);
            }
          })
          .join(' ') || '';
      const key = `${message.level}|${text.replace(/\b\d{4,}\b/g, '#').replace(/\b\d+\.\d+\b/g, '#')}`;

      if (key === this.lastFileKey) return null; // suppress duplicate

      this.lastFileKey = key;
      return message;
    };
  }
}
