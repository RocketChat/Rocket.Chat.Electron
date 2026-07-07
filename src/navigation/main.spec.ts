import fs from 'fs';

import type { Certificate } from 'electron';
import { app } from 'electron';

import { select, dispatch, request } from '../store';
import {
  AskForCertificateTrustResponse,
  askForCertificateTrust,
  askForOpeningExternalProtocol,
} from '../ui/main/dialogs';
import {
  EXTERNAL_PROTOCOL_PERMISSION_UPDATED,
  CERTIFICATES_LOADED,
  TRUSTED_CERTIFICATES_UPDATED,
  NOT_TRUSTED_CERTIFICATES_UPDATED,
} from './actions';
import {
  serializeCertificate,
  isProtocolAllowed,
  setupNavigation,
} from './main';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    unlink: jest.fn(),
  },
}));

jest.mock('electron', () => ({
  app: {
    addListener: jest.fn(),
    getPath: jest.fn(),
  },
}));
jest.mock('../store');
jest.mock('../ui/main/dialogs', () => ({
  askForOpeningExternalProtocol: jest.fn(),
  askForCertificateTrust: jest.fn(),
  AskForCertificateTrustResponse: {
    YES: 1,
    NO: 0,
  },
}));
jest.mock('electron-store', () => jest.fn());

const selectMock = select as jest.MockedFunction<typeof select>;
const dispatchMock = dispatch as jest.MockedFunction<typeof dispatch>;
const askForOpeningExternalProtocolMock =
  askForOpeningExternalProtocol as jest.MockedFunction<
    typeof askForOpeningExternalProtocol
  >;
const askForCertificateTrustMock =
  askForCertificateTrust as jest.MockedFunction<typeof askForCertificateTrust>;
const appAddListenerMock = app.addListener as jest.MockedFunction<
  typeof app.addListener
>;
const appGetPathMock = app.getPath as jest.MockedFunction<typeof app.getPath>;
const readFileMock = fs.promises.readFile as jest.MockedFunction<
  typeof fs.promises.readFile
>;
const unlinkMock = fs.promises.unlink as jest.MockedFunction<
  typeof fs.promises.unlink
>;
const requestMock = request as jest.MockedFunction<typeof request>;

const makeCertificate = (overrides: Partial<Certificate> = {}): Certificate =>
  ({
    issuerName: 'Example CA',
    data: 'CERT-DATA',
    ...overrides,
  }) as unknown as Certificate;

describe('navigation/main.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appGetPathMock.mockReturnValue('/tmp/user-data');
    readFileMock.mockResolvedValue('{}');
    unlinkMock.mockResolvedValue(undefined);
  });

  describe('serializeCertificate', () => {
    it('serializes as "<issuerName>\\n<data>"', () => {
      const certificate = makeCertificate({
        issuerName: 'Example CA',
        data: 'CERT-DATA',
      });

      expect(serializeCertificate(certificate)).toBe('Example CA\nCERT-DATA');
    });

    it('calls toString() on the data field', () => {
      const toString = jest.fn(() => 'STRINGIFIED');
      const certificate = makeCertificate({
        issuerName: 'Issuer',
        data: { toString } as unknown as Certificate['data'],
      });

      expect(serializeCertificate(certificate)).toBe('Issuer\nSTRINGIFIED');
      expect(toString).toHaveBeenCalledTimes(1);
    });

    it('handles empty issuer name', () => {
      const certificate = makeCertificate({ issuerName: '', data: 'D' });

      expect(serializeCertificate(certificate)).toBe('\nD');
    });
  });

  describe('isProtocolAllowed', () => {
    const mockExternalProtocols = (
      externalProtocols: Record<string, boolean>
    ) => {
      selectMock.mockImplementation((selector: any) =>
        selector({ externalProtocols })
      );
    };

    it.each(['http://example.com', 'https://example.com', 'mailto:a@b.com'])(
      'allows intrinsic protocol %s without prompting',
      async (url) => {
        mockExternalProtocols({});

        await expect(isProtocolAllowed(url)).resolves.toBe(true);
        expect(askForOpeningExternalProtocolMock).not.toHaveBeenCalled();
        expect(dispatchMock).not.toHaveBeenCalled();
      }
    );

    it('allows a persisted protocol that is marked allowed', async () => {
      mockExternalProtocols({ 'custom:': true });

      await expect(isProtocolAllowed('custom://thing')).resolves.toBe(true);
      expect(askForOpeningExternalProtocolMock).not.toHaveBeenCalled();
    });

    it('does not treat a persisted protocol marked as disallowed as intrinsic', async () => {
      mockExternalProtocols({ 'custom:': false });
      askForOpeningExternalProtocolMock.mockResolvedValue({
        allowed: false,
        dontAskAgain: false,
      });

      await expect(isProtocolAllowed('custom://thing')).resolves.toBe(false);
      expect(askForOpeningExternalProtocolMock).toHaveBeenCalledTimes(1);
    });

    it('prompts for an unknown protocol and returns the dialog result', async () => {
      mockExternalProtocols({});
      askForOpeningExternalProtocolMock.mockResolvedValue({
        allowed: true,
        dontAskAgain: false,
      });

      await expect(isProtocolAllowed('custom://thing')).resolves.toBe(true);
      expect(askForOpeningExternalProtocolMock).toHaveBeenCalledTimes(1);
      expect(askForOpeningExternalProtocolMock.mock.calls[0][0]).toBeInstanceOf(
        URL
      );
      expect(dispatchMock).not.toHaveBeenCalled();
    });

    it('returns false when the dialog denies and dontAskAgain is false', async () => {
      mockExternalProtocols({});
      askForOpeningExternalProtocolMock.mockResolvedValue({
        allowed: false,
        dontAskAgain: false,
      });

      await expect(isProtocolAllowed('custom://thing')).resolves.toBe(false);
      expect(dispatchMock).not.toHaveBeenCalled();
    });

    it('persists the permission when dontAskAgain is true (allowed)', async () => {
      mockExternalProtocols({});
      askForOpeningExternalProtocolMock.mockResolvedValue({
        allowed: true,
        dontAskAgain: true,
      });

      await expect(isProtocolAllowed('custom://thing')).resolves.toBe(true);
      expect(dispatchMock).toHaveBeenCalledWith({
        type: EXTERNAL_PROTOCOL_PERMISSION_UPDATED,
        payload: { protocol: 'custom:', allowed: true },
      });
    });

    it('persists the denial when dontAskAgain is true (denied)', async () => {
      mockExternalProtocols({});
      askForOpeningExternalProtocolMock.mockResolvedValue({
        allowed: false,
        dontAskAgain: true,
      });

      await expect(isProtocolAllowed('custom://thing')).resolves.toBe(false);
      expect(dispatchMock).toHaveBeenCalledWith({
        type: EXTERNAL_PROTOCOL_PERMISSION_UPDATED,
        payload: { protocol: 'custom:', allowed: false },
      });
    });

    it('rejects on a malformed URL', async () => {
      mockExternalProtocols({});

      await expect(isProtocolAllowed('not a url')).rejects.toThrow();
      expect(askForOpeningExternalProtocolMock).not.toHaveBeenCalled();
    });
  });

  describe('setupNavigation', () => {
    const setup = async () => {
      await setupNavigation();
    };
    const getListener = (eventName: string): jest.Mock =>
      (appAddListenerMock.mock.calls as Array<[string, jest.Mock]>).find(
        ([event]) => event === eventName
      )?.[1] ?? jest.fn();

    const setNavigationState = (
      state: Partial<{
        trustedCertificates: Record<string, string>;
        notTrustedCertificates: Record<string, string>;
        servers: Array<{
          url: string;
          username?: string;
          password?: string;
        }>;
      }> = {}
    ) => {
      selectMock.mockImplementation((selector: any) =>
        selector({
          externalProtocols: {},
          trustedCertificates: {},
          notTrustedCertificates: {},
          servers: [],
          ...state,
        })
      );
    };

    it('registers listeners and loads merged certificates', async () => {
      readFileMock.mockResolvedValue(
        JSON.stringify({ fromFile: 'certificateFromDisk' })
      );
      setNavigationState({
        trustedCertificates: { fromStore: 'certificateFromStore' },
      });

      await setup();

      expect(appGetPathMock).toHaveBeenCalledWith('userData');
      expect(readFileMock).toHaveBeenCalledWith(
        '/tmp/user-data/certificate.json',
        'utf8'
      );
      expect(unlinkMock).toHaveBeenCalledWith(
        '/tmp/user-data/certificate.json'
      );
      expect(dispatchMock).toHaveBeenCalledWith({
        type: CERTIFICATES_LOADED,
        payload: {
          fromStore: 'certificateFromStore',
          fromFile: 'certificateFromDisk',
        },
      });
    });

    it('falls back to trusted store when reading certificate file fails', async () => {
      readFileMock.mockRejectedValue(new Error('missing file'));
      setNavigationState({
        trustedCertificates: {
          fromStore: 'certificateFromStore',
        },
      });

      await setup();

      expect(dispatchMock).toHaveBeenCalledWith({
        type: CERTIFICATES_LOADED,
        payload: {
          fromStore: 'certificateFromStore',
        },
      });
    });

    it('treats non-object certificate files as empty cache', async () => {
      readFileMock.mockResolvedValue('"invalid"');
      setNavigationState({
        trustedCertificates: {
          fromStore: 'certificateFromStore',
        },
      });

      await setup();

      expect(dispatchMock).toHaveBeenCalledWith({
        type: CERTIFICATES_LOADED,
        payload: {
          fromStore: 'certificateFromStore',
        },
      });
    });

    it('accepts a trusted certificate without prompting', async () => {
      const event = { preventDefault: jest.fn() };
      const callback = jest.fn();
      const certificate = makeCertificate({
        fingerprint: 'trusted',
        issuerName: 'Test CA',
        data: 'DATA',
      });
      const serialized = serializeCertificate(certificate);

      setNavigationState({
        trustedCertificates: {
          'server.local': serialized,
        },
      });

      await setup();
      const certificateErrorListener = getListener('certificate-error');
      await certificateErrorListener(
        event as never,
        {} as never,
        'https://server.local/path',
        'ERR',
        certificate,
        callback
      );

      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(true);
      expect(askForCertificateTrustMock).not.toHaveBeenCalled();
    });

    it('rejects a certificate explicitly marked as not trusted', async () => {
      const event = { preventDefault: jest.fn() };
      const callback = jest.fn();
      const certificate = makeCertificate({
        fingerprint: 'not-trusted',
        issuerName: 'Test CA',
        data: 'DATA',
      });
      const serialized = serializeCertificate(certificate);

      setNavigationState({
        notTrustedCertificates: {
          'server.local': serialized,
        },
      });

      await setup();
      const certificateErrorListener = getListener('certificate-error');
      await certificateErrorListener(
        event as never,
        {} as never,
        'https://server.local/path',
        'ERR',
        certificate,
        callback
      );

      expect(callback).toHaveBeenCalledWith(false);
      expect(askForCertificateTrustMock).not.toHaveBeenCalled();
    });

    it('queues trust requests for repeated certificate fingerprints', async () => {
      const firstEvent = { preventDefault: jest.fn() };
      const secondEvent = { preventDefault: jest.fn() };
      const firstCallback = jest.fn();
      const secondCallback = jest.fn();
      let resolver: (value: AskForCertificateTrustResponse) => void = () => {};
      askForCertificateTrustMock.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolver = resolve as (
              value: AskForCertificateTrustResponse
            ) => void;
          })
      );

      const certificate = makeCertificate({
        fingerprint: 'queued',
        issuerName: 'Test CA',
        data: 'DATA',
      });
      const serialized = serializeCertificate(certificate);

      setNavigationState({
        trustedCertificates: {},
      });

      await setup();
      const certificateErrorListener = getListener('certificate-error');
      const firstResponse = certificateErrorListener(
        firstEvent as never,
        {} as never,
        'https://server.local/path',
        'ERR',
        certificate,
        firstCallback
      );
      const secondResponse = certificateErrorListener(
        secondEvent as never,
        {} as never,
        'https://server.local/path',
        'ERR',
        certificate,
        secondCallback
      );

      expect(firstCallback).toHaveBeenCalledTimes(0);
      expect(secondCallback).toHaveBeenCalledTimes(0);
      expect(askForCertificateTrustMock).toHaveBeenCalledTimes(1);

      resolver(AskForCertificateTrustResponse.YES);

      await Promise.all([firstResponse, secondResponse]);
      expect(firstCallback).toHaveBeenCalledWith(true);
      expect(secondCallback).toHaveBeenCalledWith(true);
      expect(dispatchMock).toHaveBeenCalledWith({
        type: TRUSTED_CERTIFICATES_UPDATED,
        payload: { 'server.local': serialized },
      });
    });

    it('uses the different-certificate message when host was previously trusted', async () => {
      const event = { preventDefault: jest.fn() };
      const callback = jest.fn();
      const certificate = makeCertificate({
        fingerprint: 'previous-cert',
        issuerName: 'Test CA',
        data: 'DATA',
      });
      setNavigationState({
        trustedCertificates: {
          'server.local': 'different-certificate',
        },
      });
      askForCertificateTrustMock.mockResolvedValue(
        AskForCertificateTrustResponse.NO
      );

      await setup();
      const certificateErrorListener = getListener('certificate-error');
      await certificateErrorListener(
        event as never,
        {} as never,
        'https://server.local/path',
        'ERR',
        certificate,
        callback
      );

      expect(askForCertificateTrustMock).toHaveBeenCalledWith(
        certificate.issuerName,
        undefined
      );
      expect(callback).toHaveBeenCalledWith(false);
    });

    it('stores trust decision as "not trusted" when user denies', async () => {
      const event = { preventDefault: jest.fn() };
      const callback = jest.fn();
      const certificate = makeCertificate({
        fingerprint: 'queued-deny',
        issuerName: 'Test CA',
        data: 'DATA',
      });
      const serialized = serializeCertificate(certificate);
      askForCertificateTrustMock.mockResolvedValue(
        AskForCertificateTrustResponse.NO
      );

      setNavigationState();

      await setup();
      const certificateErrorListener = getListener('certificate-error');
      await certificateErrorListener(
        event as never,
        {} as never,
        'https://server.local/path',
        'ERR',
        certificate,
        callback
      );

      expect(callback).toHaveBeenCalledWith(false);
      expect(dispatchMock).toHaveBeenCalledWith({
        type: NOT_TRUSTED_CERTIFICATES_UPDATED,
        payload: { 'server.local': serialized },
      });
    });

    it('chooses the only client certificate when available without prompting', async () => {
      const event = { preventDefault: jest.fn() };
      const callback = jest.fn();
      const certificate = makeCertificate({ fingerprint: 'single' });
      const certificateList = [certificate];
      await setup();
      const selectListener = getListener('select-client-certificate');

      await selectListener(
        event as never,
        {} as never,
        {} as never,
        certificateList,
        callback
      );

      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(certificate);
    });

    it('prompts and selects a client certificate when multiple are available', async () => {
      const event = { preventDefault: jest.fn() };
      const callback = jest.fn();
      const selectedCertificate = makeCertificate({ fingerprint: 'selected' });
      const certificateList = [
        makeCertificate({ fingerprint: 'other' }),
        selectedCertificate,
      ];
      await setup();
      const selectListener = getListener('select-client-certificate');
      requestMock.mockResolvedValue('selected');

      await selectListener(
        event as never,
        {} as never,
        {} as never,
        certificateList,
        callback
      );

      expect(event.preventDefault).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(selectedCertificate);
      expect(requestMock).toHaveBeenCalledWith(
        {
          type: 'certificates/client-certificate-requested',
          payload: JSON.parse(JSON.stringify(certificateList)),
        },
        'select-client-certificate-dialog/certificate-selected',
        'select-client-certificate-dialog/dismissed'
      );
    });

    it('returns undefined if selected client certificate is not found', async () => {
      const event = { preventDefault: jest.fn() };
      const callback = jest.fn();
      const certificateList = [
        makeCertificate({ fingerprint: 'other' }),
        makeCertificate({ fingerprint: 'still-other' }),
      ];
      await setup();
      const selectListener = getListener('select-client-certificate');
      requestMock.mockResolvedValue('missing');

      await selectListener(
        event as never,
        {} as never,
        {} as never,
        certificateList,
        callback
      );

      expect(callback).toHaveBeenCalledWith(undefined);
    });

    it('uses credentials when server host matches login request', async () => {
      const event = { preventDefault: jest.fn() };
      const callback = jest.fn();
      setNavigationState({
        servers: [
          {
            url: 'https://login-user:login-pass@server.local',
          },
        ],
      });
      await setup();
      const loginListener = getListener('login');

      await loginListener(
        event as never,
        {} as never,
        { url: 'https://server.local/path' } as never,
        {} as never,
        callback
      );

      expect(event.preventDefault).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith('login-user', 'login-pass');
    });

    it('falls back to unauthenticated login callback when host does not match', async () => {
      const event = { preventDefault: jest.fn() };
      const callback = jest.fn();
      setNavigationState({
        servers: [
          {
            url: 'https://other.local',
            username: 'login-user',
            password: 'login-pass',
          },
        ],
      });
      await setup();
      const loginListener = getListener('login');

      await loginListener(
        event as never,
        {} as never,
        { url: 'https://server.local/path' } as never,
        {} as never,
        callback
      );

      expect(callback).toHaveBeenCalledWith();
    });
  });
});
