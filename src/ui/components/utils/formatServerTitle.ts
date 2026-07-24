/**
 * Cleans up a server's display name: strips the `https://`/`http://` scheme
 * (wherever it appears) and any trailing slashes, so an address-y title reads
 * as "example.rocket.chat" instead of "https://example.rocket.chat/".
 */
export const formatServerTitle = (title: string): string =>
  title.replace(/(^|\s)(https?:\/\/)/, '$1').replace(/\/+$/, '');
