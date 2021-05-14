import { createServer, Server } from 'http';

import { fetchServerInformation } from './fetchServerInformation';

let baseUri: string;
let serverVersion: string;
let server: Server | null;

beforeEach(() => {
  const port = Math.round(Math.random() * 1000 + 3000);
  baseUri = `http://localhost:${port}`;
  serverVersion = Array.from({ length: 3 }, () =>
    Math.round(Math.random() * 9)
  ).join('.');

  server = createServer((req, res) => {
    if (req.url === '/' || req.url?.match(/^(\/subdir)+\/$/)) {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.write('Home');
      res.end();
      return;
    }

    if (req.url === '/api/info' || req.url?.match(/^(\/subdir)+\/api\/info$/)) {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
      });
      res.write(
        JSON.stringify({
          success: true,
          version: serverVersion,
        })
      );
      res.end();
      return;
    }

    if (req.url === '/redirect') {
      res.writeHead(302, { Location: `${baseUri}/subdir/` });
      res.end();
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.write('Not found!');
    res.end();
  });

  server.listen(port);
});

afterEach(() => {
  server?.close();
  server = null;
});

it('reaches the server at root directory', async () => {
  const [effectiveUrl, version] = await fetchServerInformation(
    new URL(`${baseUri}/`)
  );
  expect(effectiveUrl).toStrictEqual(new URL(`${baseUri}/`));
  expect(version).toStrictEqual(serverVersion);
});

it('reaches the server at subdirectory', async () => {
  const [effectiveUrl, version] = await fetchServerInformation(
    new URL(`${baseUri}/subdir/`)
  );
  expect(effectiveUrl).toStrictEqual(new URL(`${baseUri}/subdir/`));
  expect(version).toStrictEqual(serverVersion);
});

it('reaches the server at deep subdirectory', async () => {
  const [effectiveUrl, version] = await fetchServerInformation(
    new URL(`${baseUri}/subdir/subdir/subdir/`)
  );
  expect(effectiveUrl).toStrictEqual(
    new URL(`${baseUri}/subdir/subdir/subdir/`)
  );
  expect(version).toStrictEqual(serverVersion);
});

it('reaches the server after redirection', async () => {
  const [effectiveUrl, version] = await fetchServerInformation(
    new URL(`${baseUri}/redirect`)
  );
  expect(effectiveUrl).toStrictEqual(new URL(`${baseUri}/subdir/`));
  expect(version).toStrictEqual(serverVersion);
});
