import { createServer, Server } from 'http';

import { fetchInfo } from './renderer';

describe('servers/fetch-info', () => {
  const serverVersion = Array.from({ length: 3 }, () =>
    Math.round(Math.random() * 9)
  ).join('.');
  let server: Server | null;

  beforeEach(() => {
    server = createServer((req, res) => {
      if (req.url === '/' || req.url?.match(/^(\/subdir)+\/$/)) {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.write('Home');
        res.end();
        return;
      }

      if (
        req.url === '/api/info' ||
        req.url?.match(/^(\/subdir)+\/api\/info$/)
      ) {
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
        res.writeHead(302, { Location: 'http://localhost:3000/subdir/' });
        res.end();
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.write('Not found!');
      res.end();
    });

    server.listen(3000);
  });

  afterEach(() => {
    server?.close();
    server = null;
  });

  it('reaches the server at root directory', async () => {
    const [effectiveUrl, version] = await fetchInfo('http://localhost:3000/');
    expect(effectiveUrl).toStrictEqual('http://localhost:3000/');
    expect(version).toStrictEqual(serverVersion);
  });

  it('reaches the server at subdirectory', async () => {
    const [effectiveUrl, version] = await fetchInfo(
      'http://localhost:3000/subdir/'
    );
    expect(effectiveUrl).toStrictEqual('http://localhost:3000/subdir/');
    expect(version).toStrictEqual(serverVersion);
  });

  it('reaches the server at deep subdirectory', async () => {
    const [effectiveUrl, version] = await fetchInfo(
      'http://localhost:3000/subdir/subdir/subdir/'
    );
    expect(effectiveUrl).toStrictEqual(
      'http://localhost:3000/subdir/subdir/subdir/'
    );
    expect(version).toStrictEqual(serverVersion);
  });

  it('reaches the server after redirection', async () => {
    const [effectiveUrl, version] = await fetchInfo(
      'http://localhost:3000/redirect'
    );
    expect(effectiveUrl).toStrictEqual('http://localhost:3000/subdir/');
    expect(version).toStrictEqual(serverVersion);
  });
});
