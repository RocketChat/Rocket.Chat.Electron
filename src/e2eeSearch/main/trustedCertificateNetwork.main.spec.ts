import https from 'node:https';
import type { AddressInfo } from 'node:net';

import type { Certificate } from 'electron';
import { app, BrowserWindow, session } from 'electron';

import { serializeCertificate } from '../../navigation/main';
import {
  createTrustedCertificateVerifyProc,
  createUserCheckFetch,
} from '../trustedCertificate';
import { verifyServerUserId } from '../verifyUser';
import { createSelfSignedCertificate } from './selfSignedCertificate';

jest.mock('../../ui/main/dialogs', () => ({}));

// The user check on Electron's real network stack, against a server on a
// subpath with a self-signed certificate. The trust entry comes from the
// certificate that a page load shows to `certificate-error`, like the
// certificate dialog stores it (navigation/main.ts).
//
// The test runner starts Electron with `--ignore-certificate-errors`, which
// accepts every certificate. This spec runs only without that switch:
// ELECTRON_OPTIONS='!ignore-certificate-errors' yarn test <this file>
const describeWithCertificateErrors = app.commandLine.hasSwitch(
  'ignore-certificate-errors'
)
  ? describe.skip
  : describe;

const startServer = async () => {
  const server = https.createServer(
    createSelfSignedCertificate('127.0.0.1'),
    (req, res) => {
      if (
        req.url === '/chat/api/v1/me' &&
        req.headers['x-user-id'] === 'userB' &&
        req.headers['x-auth-token'] === 'tokenB'
      ) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('{"_id":"userB"}');
        return;
      }
      res.writeHead(req.url?.startsWith('/chat/') ? 401 : 404);
      res.end();
    }
  );
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;
  return {
    host: `127.0.0.1:${port}`,
    serverUrl: `https://127.0.0.1:${port}/chat`,
    stop: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
};

// The certificate as the certificate dialog gets it: a page load
// that `certificate-error` refuses.
const certificateOfPageLoad = async (url: string): Promise<Certificate> => {
  const window = new BrowserWindow({
    show: false,
    webPreferences: { partition: `e2ee-search-page-${Math.random()}` },
  });
  try {
    return await new Promise<Certificate>((resolve) => {
      const listener = (
        event: Electron.Event,
        _webContents: Electron.WebContents,
        _url: string,
        _error: string,
        certificate: Certificate,
        callback: (isTrusted: boolean) => void
      ) => {
        event.preventDefault();
        callback(false);
        app.removeListener('certificate-error', listener);
        resolve(certificate);
      };
      app.on('certificate-error', listener);
      window.loadURL(url).catch(() => undefined);
    });
  } finally {
    window.destroy();
  }
};

const userCheckOf = (trusted: Record<string, string>) => {
  const webviewSession = session.fromPartition(
    `e2ee-search-webview-${Math.random()}`
  );
  const trustedSession = session.fromPartition(
    `e2ee-search-trusted-${Math.random()}`
  );
  trustedSession.setCertificateVerifyProc(
    createTrustedCertificateVerifyProc({
      trustedCertificates: () => trusted,
      serializeCertificate,
    })
  );
  return {
    readLoginToken: async () => 'tokenB',
    fetch: createUserCheckFetch({
      webviewFetch: (url, init) => webviewSession.fetch(url, init),
      trustedFetch: (url, init) => trustedSession.fetch(url, init),
      hasTrustedCertificate: (host) => typeof trusted[host] === 'string',
    }),
    plainFetch: (url: string, init: RequestInit) =>
      webviewSession.fetch(url, init),
  };
};

describeWithCertificateErrors(
  'the user check against a server with a self-signed certificate',
  () => {
    let trustedServer: Awaited<ReturnType<typeof startServer>>;
    let otherServer: Awaited<ReturnType<typeof startServer>>;
    let trustedEntry: string;

    beforeAll(async () => {
      await app.whenReady();
      trustedServer = await startServer();
      otherServer = await startServer();
      trustedEntry = serializeCertificate(
        await certificateOfPageLoad(`${trustedServer.serverUrl}/`)
      );
    });

    afterAll(async () => {
      await trustedServer?.stop();
      await otherServer?.stop();
    });

    it('fails in the webview session, even when the user trusted the certificate', async () => {
      const check = userCheckOf({ [trustedServer.host]: trustedEntry });
      // The app trusts the certificate in this event. A request of the main
      // process never reaches it.
      const certificateErrors: string[] = [];
      const trustAll = (
        event: Electron.Event,
        _webContents: Electron.WebContents,
        url: string,
        _error: string,
        _certificate: Certificate,
        callback: (isTrusted: boolean) => void
      ) => {
        event.preventDefault();
        certificateErrors.push(url);
        callback(true);
      };
      app.on('certificate-error', trustAll);
      try {
        await expect(
          verifyServerUserId(
            { readLoginToken: check.readLoginToken, fetch: check.plainFetch },
            trustedServer.serverUrl,
            'userB'
          )
        ).rejects.toThrow('net::ERR_CERT_AUTHORITY_INVALID');
      } finally {
        app.removeListener('certificate-error', trustAll);
      }
      expect(certificateErrors).toEqual([]);
    });

    it('confirms the user on a subpath server through the trusted certificate', async () => {
      const check = userCheckOf({ [trustedServer.host]: trustedEntry });
      await expect(
        verifyServerUserId(check, trustedServer.serverUrl, 'userB')
      ).resolves.toBe(true);
    });

    it('refuses another certificate of a host with a trusted certificate', async () => {
      // The entry of this host holds the certificate of the other server.
      const check = userCheckOf({ [otherServer.host]: trustedEntry });
      await expect(
        verifyServerUserId(check, otherServer.serverUrl, 'userB')
      ).rejects.toThrow(/ERR_CERT/);
    });

    it('refuses the certificate when the user did not trust it', async () => {
      const check = userCheckOf({});
      await expect(
        verifyServerUserId(check, trustedServer.serverUrl, 'userB')
      ).rejects.toThrow(/ERR_CERT/);
    });
  }
);
