import { handle } from '../../ipc/main';
import { getTelephonyDiagnostics } from '../diagnostics';
import { setupTelephonyIpc } from '../ipc';

jest.mock('../../ipc/main', () => ({
  handle: jest.fn(),
}));

jest.mock('../diagnostics', () => ({
  getTelephonyDiagnostics: jest.fn(async () => ({
    deviceCount: 3,
  })),
}));

const mockHandle = jest.mocked(handle);
const mockGetTelephonyDiagnostics = jest.mocked(getTelephonyDiagnostics);

describe('telephony/ipc', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupTelephonyIpc();
  });

  it('registers diagnostics handler', () => {
    expect(mockHandle).toHaveBeenCalledWith(
      'telephony/get-diagnostics',
      expect.any(Function)
    );
  });

  it('delegates diagnostics request to getTelephonyDiagnostics', async () => {
    const mockHandler = mockHandle.mock.calls[0][1];

    await expect(mockHandler({} as any)).resolves.toEqual({ deviceCount: 3 });
    expect(mockGetTelephonyDiagnostics).toHaveBeenCalledTimes(1);
  });
});
