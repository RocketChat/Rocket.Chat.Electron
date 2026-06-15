/**
 * Distinguishes a Rocket.Chat title-link (view intent) from a download button.
 * Title-link builds the URL with URLSearchParams, serializing the empty value as
 * `?download=` (trailing `=`). The download button concatenates a bare `?download`
 * with no `=`. The trailing `=` is the only signal separating view from download.
 */
export const isMarkdownViewerDownloadUrl = (
  url: string,
  filename: string
): boolean => filename.endsWith('.md') && url.endsWith('download=');
