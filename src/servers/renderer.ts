import { handle } from '../ipc/renderer';

handle('servers/fetch-info', async (urlHref): Promise<[urlHref: string, version: string]> => {
  const url = new URL(urlHref);

  const { username, password } = url;
  const headers = new Headers();

  if (username && password) {
    headers.append('Authorization', `Basic ${ btoa(`${ username }:${ password }`) }`);
  }

  const endpoint = new URL('api/info', url);

  const response = await fetch(endpoint.href, { headers });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const responseBody: {
    success: boolean;
    version: string;
  } = await response.json();

  if (!responseBody.success) {
    throw new Error();
  }

  return [new URL('../..', response.url).href, responseBody.version];
});
