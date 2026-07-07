jest.mock('../../ipc/main', () => ({
  handle: jest.fn(),
}));

jest.mock('../../telephony/diagnostics', () => ({
  getTelephonyDiagnostics: jest.fn(async () => ({
    deviceCount: 3,
  })),
}));

const { handle: mockHandle } = require('../../ipc/main');
const { getTelephonyDiagnostics } = require('../../telephony/diagnostics');
const { setupTelephonyIpc } = require('../../telephony/ipc');

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
    const mockHandler = (mockHandle as jest.Mock).mock.calls[0][1];

    await expect(mockHandler()).resolves.toEqual({ deviceCount: 3 });
    expect(getTelephonyDiagnostics).toHaveBeenCalledTimes(1);
  });
});
