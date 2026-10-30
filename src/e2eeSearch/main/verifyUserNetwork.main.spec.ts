import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { app, session } from 'electron';

import { fetchServerPublicKey, verifyServerUserId } from '../verifyUser';

// The checks run here on Electron's real network stack, like `setup.ts`
// sends them (`session.fetch`). A mocked fetch proves only that the code
// aborts its signal. This spec proves that the abort also closes the
// connection to a hostile server.

type Mode = 'hang' | 'endless';

// The time that the server waits for the app to close the connection.
const CLOSE_LIMIT_MS = 3_000;

const startServer = async (mode: Mode) => {
  let closeSocket!: () => void;
  const socketClosed = new Promise<void>((resolve) => {
    closeSocket = resolve;
  });
  const server = http.createServer((req, res) => {
    req.socket.once('close', () => closeSocket());
    if (mode === 'hang') return;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.write('{"_id":"');
    const timer = setInterval(() => {
      if (res.destroyed || res.writableEnded) {
        clearInterval(timer);
        return;
      }
      res.write('A'.repeat(64 * 1024));
    }, 10);
    res.once('close', () => clearInterval(timer));
  });
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;
  return {
    serverUrl: `http://127.0.0.1:${port}`,
    socketClosed,
    stop: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
};

const closedInTime = (socketClosed: Promise<void>) =>
  Promise.race([
    socketClosed.then(() => true),
    new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), CLOSE_LIMIT_MS);
    }),
  ]);

const checks = {
  verifyServerUserId: (
    deps: Parameters<typeof verifyServerUserId>[0],
    serverUrl: string
  ) => verifyServerUserId(deps, serverUrl, 'userB'),
  fetchServerPublicKey: (
    deps: Parameters<typeof verifyServerUserId>[0],
    serverUrl: string
  ) => fetchServerPublicKey(deps, serverUrl, 'userB'),
};

const cases = Object.entries(checks).flatMap(([name, check]) =>
  (['hang', 'endless'] as const).map(
    (mode) => [name, mode, check] as [string, Mode, typeof check]
  )
);

describe('the user and key checks on the Electron network stack', () => {
  beforeAll(() => app.whenReady());

  it.each(cases)(
    '%s closes the connection of a server that sends a %s answer',
    async (_, mode, check) => {
      const server = await startServer(mode);
      try {
        const ses = session.fromPartition(`e2ee-search-verify-${mode}`);
        await expect(
          check(
            {
              readLoginToken: async () => 'tokenB',
              fetch: (url, init) => ses.fetch(url, init),
              timeoutMs: 500,
            },
            server.serverUrl
          )
        ).rejects.toThrow(mode === 'hang' ? 'timed out' : 'too large');

        await expect(closedInTime(server.socketClosed)).resolves.toBe(true);
      } finally {
        await server.stop();
      }
    }
  );
});
