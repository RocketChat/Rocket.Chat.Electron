import attentionDrawing from '../attentionDrawing';

const getRootWindow = jest.fn();
const select = jest.fn();

jest.mock('../../store', () => {
  class Service {
    protected destroy(): void {}
  }
  return {
    Service,
    select: (...args: unknown[]) => select(...args),
  };
});

jest.mock('../../ui/main/rootWindow', () => ({
  getRootWindow: (...args: unknown[]) => getRootWindow(...args),
}));

jest.mock('electron', () => ({
  app: {
    dock: {
      bounce: jest.fn(() => 7),
      cancelBounce: jest.fn(),
    },
  },
}));

describe('attentionDrawing', () => {
  const flashFrame = jest.fn();
  const browserWindow = {
    isDestroyed: jest.fn(() => false),
    flashFrame,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getRootWindow.mockResolvedValue(browserWindow);
    select.mockImplementation((selector: (s: any) => any) =>
      selector({ isFlashFrameEnabled: true })
    );
    // reset internal set via stopAttention if needed
  });

  it('no-ops when flash frame disabled', async () => {
    select.mockImplementation((selector: (s: any) => any) =>
      selector({ isFlashFrameEnabled: false })
    );
    await attentionDrawing.drawAttention('n1');
    expect(getRootWindow).not.toHaveBeenCalled();
  });

  it('flashes frame on non-darwin platforms', async () => {
    const original = process.platform;
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      configurable: true,
    });

    await attentionDrawing.drawAttention('n-linux');
    expect(flashFrame).toHaveBeenCalledWith(true);

    await attentionDrawing.stopAttention('n-linux');
    expect(flashFrame).toHaveBeenCalledWith(false);

    Object.defineProperty(process, 'platform', {
      value: original,
      configurable: true,
    });
  });

  it('ignores duplicate drawAttention for same notification id', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      configurable: true,
    });
    await attentionDrawing.drawAttention('dup');
    flashFrame.mockClear();
    await attentionDrawing.drawAttention('dup');
    expect(flashFrame).not.toHaveBeenCalled();
    await attentionDrawing.stopAttention('dup');
  });

  it('keeps attention while other notifications remain active', async () => {
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      configurable: true,
    });
    await attentionDrawing.drawAttention('a');
    await attentionDrawing.drawAttention('b');
    flashFrame.mockClear();
    await attentionDrawing.stopAttention('a');
    expect(flashFrame).not.toHaveBeenCalled();
    await attentionDrawing.stopAttention('b');
    expect(flashFrame).toHaveBeenCalledWith(false);
  });
});
