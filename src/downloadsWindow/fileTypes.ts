/** Longest label that still reads at icon size; "jpeg" and "webm" both fit. */
const MAX_LABEL_LENGTH = 4;

/**
 * The short tag shown on the file icon — the file's extension, or the MIME
 * subtype when a name has none (a download can arrive as "file" with
 * `image/png`).
 */
export const getFileLabel = (fileName: string, mimeType?: string): string => {
  const fromName = fileName.includes('.')
    ? fileName.slice(fileName.lastIndexOf('.') + 1)
    : '';

  const subtype = mimeType?.split('/')?.[1] ?? '';
  const raw = fromName || subtype.split('+')[0];

  return raw.replace(/[^a-z0-9]/gi, '').slice(0, MAX_LABEL_LENGTH);
};
