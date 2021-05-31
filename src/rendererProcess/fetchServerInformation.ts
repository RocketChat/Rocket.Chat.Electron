export const fetchServerInformation = async (
  url: URL
): Promise<[url: URL, version: string]> => {
  const { username, password } = url;
  const headers = new Headers();

  if (username && password) {
    headers.append('Authorization', `Basic ${btoa(`${username}:${password}`)}`);
  }

  const homeResponse = await fetch(url.href, { headers });

  if (!homeResponse.ok) {
    throw new Error(homeResponse.statusText);
  }

  const endpoint = new URL('api/info', homeResponse.url);

  const apiInfoResponse = await fetch(endpoint.href, { headers });

  if (!apiInfoResponse.ok) {
    throw new Error(apiInfoResponse.statusText);
  }

  const responseBody: {
    success: boolean;
    version: string;
  } = await apiInfoResponse.json();

  if (!responseBody.success) {
    throw new Error();
  }

  return [new URL('..', apiInfoResponse.url), responseBody.version];
};
