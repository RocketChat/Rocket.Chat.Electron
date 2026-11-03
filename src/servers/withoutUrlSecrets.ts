// Failure reports are saved with the server list and pasted into support
// tickets, and a URL can carry credentials, a login code or a token.
export const withoutUrlSecrets = (url: string): string => {
  try {
    const parsed = new URL(url);
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.href;
  } catch {
    return url
      .split(/[?#]/, 1)[0]
      .replace(/^([a-z][a-z\d+.-]*:\/\/)[^/]*@/i, '$1');
  }
};
