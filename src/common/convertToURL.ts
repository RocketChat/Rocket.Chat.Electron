export const convertToURL = (input: string): URL => {
  let url: URL;

  if (/^https?:\/\//.test(input)) {
    url = new URL(input);
  } else {
    url = new URL(`https://${input}`);
  }

  const { protocol, username, password, hostname, port, pathname } = url;
  return Object.assign(new URL('https://0.0.0.0'), {
    protocol,
    username,
    password,
    hostname,
    port:
      (protocol === 'http' && port === '80' && undefined) ||
      (protocol === 'https' && port === '443' && undefined) ||
      port,
    pathname: /\/$/.test(pathname) ? pathname : `${pathname}/`,
  });
};
