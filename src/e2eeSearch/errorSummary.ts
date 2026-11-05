// A log-safe view of an error: its name and its code only. An fs error
// message holds the index path, and the path holds the user id, so the
// message never goes to the log. The check reads the shape, not
// `instanceof Error`, because an error from another realm (a vm context or
// a structured clone) is not an instance of this realm's `Error`.
export const summarizeError = (
  error: unknown
): { name: string; code?: string } => {
  if (typeof error !== 'object' || error === null)
    return { name: typeof error };
  const { name, code } = error as { name?: unknown; code?: unknown };
  const safeName = typeof name === 'string' ? name : 'object';
  return typeof code === 'string'
    ? { name: safeName, code }
    : { name: safeName };
};
