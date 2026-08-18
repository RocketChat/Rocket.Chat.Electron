const render = jest.fn();
const createRoot = jest.fn((_el?: any) => ({
  render,
  unmount: jest.fn(),
})) as jest.Mock;

jest.mock('react-dom/client', () => ({
  createRoot: (el: any) => (createRoot as any)(el),
}));

jest.mock('react-i18next', () => ({
  I18nextProvider: ({ children }: any) => children,
}));

jest.mock('i18next', () => ({
  __esModule: true,
  default: { t: (k: string) => k },
}));

jest.mock('../../screenSharing/screenSharePicker', () => ({
  ScreenSharePicker: () => null,
}));

describe('screenSharePickerMount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    document.body.innerHTML = '';
  });

  it('mounts when container exists and is idempotent', () => {
    const root = document.createElement('div');
    root.id = 'screen-picker-root';
    document.body.appendChild(root);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../screenSharePickerMount');
    mod.mount();
    mod.mount();
    expect(createRoot).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalled();
  });

  it('logs error when container missing', () => {
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../screenSharePickerMount');
    mod.mount();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it('show mounts when not yet mounted', () => {
    const root = document.createElement('div');
    root.id = 'screen-picker-root';
    document.body.appendChild(root);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../screenSharePickerMount');
    mod.show();
    expect(createRoot).toHaveBeenCalled();
  });
});
