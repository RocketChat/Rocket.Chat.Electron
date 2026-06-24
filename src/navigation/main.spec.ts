import type { Certificate } from 'electron';

import { select, dispatch } from '../store';
import { askForOpeningExternalProtocol } from '../ui/main/dialogs';
import { EXTERNAL_PROTOCOL_PERMISSION_UPDATED } from './actions';
import { serializeCertificate, isProtocolAllowed } from './main';

jest.mock('electron', () => ({
  app: {
    addListener: jest.fn(),
    getPath: jest.fn(),
  },
}));
jest.mock('../store');
jest.mock('../ui/main/dialogs');

const selectMock = select as jest.MockedFunction<typeof select>;
const dispatchMock = dispatch as jest.MockedFunction<typeof dispatch>;
const askForOpeningExternalProtocolMock =
  askForOpeningExternalProtocol as jest.MockedFunction<
    typeof askForOpeningExternalProtocol
  >;

const makeCertificate = (overrides: Partial<Certificate> = {}): Certificate =>
  ({
    issuerName: 'Example CA',
    data: 'CERT-DATA',
    ...overrides,
  }) as unknown as Certificate;

describe('navigation/main.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
