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
  const originalPlatform = process.platform;

  const setPlatform = (value: NodeJS.Platform) => {
    Object.defineProperty(process, 'platform', {
      value,
      configurable: true,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getRootWindow.mockResolvedValue(browserWindow);
    select.mockImplementation((selector: (s: any) => any) =>
      selector({ isFlashFrameEnabled: true })
    );
  });

  afterEach(() => {
    setPlatform(originalPlatform);
  });

  it('no-ops when flash frame disabled', async () => {
    select.mockImplementation((selector: (s: any) => any) =>
      selector({ isFlashFrameEnabled: false })
    );
    await attentionDrawing.drawAttention('n1');
    expect(getRootWindow).not.toHaveBeenCalled();
  });

  it('flashes frame on non-darwin platforms', async () => {
    setPlatform('linux');

    await attentionDrawing.drawAttention('n-linux');
    expect(flashFrame).toHaveBeenCalledWith(true);

    await attentionDrawing.stopAttention('n-linux');
    expect(flashFrame).toHaveBeenCalledWith(false);
  });

  it('ignores duplicate drawAttention for same notification id', async () => {
    setPlatform('linux');
    await attentionDrawing.drawAttention('dup');
    flashFrame.mockClear();
    await attentionDrawing.drawAttention('dup');
    expect(flashFrame).not.toHaveBeenCalled();
    await attentionDrawing.stopAttention('dup');
  });

  it('keeps attention while other notifications remain active', async () => {
    setPlatform('linux');
    await attentionDrawing.drawAttention('a');
    await attentionDrawing.drawAttention('b');
    flashFrame.mockClear();
    await attentionDrawing.stopAttention('a');
    expect(flashFrame).not.toHaveBeenCalled();
    await attentionDrawing.stopAttention('b');
    expect(flashFrame).toHaveBeenCalledWith(false);
  });
});
