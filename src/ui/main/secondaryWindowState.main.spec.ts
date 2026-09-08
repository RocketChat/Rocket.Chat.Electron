import { screen } from 'electron';

import { listen, select } from '../../store';
import type * as SecondaryWindowStateModule from './secondaryWindowState';
import { getSavedWindowBounds } from './secondaryWindowState';

jest.mock('electron', () => ({
  screen: { getAllDisplays: jest.fn() },
}));

jest.mock('../../store', () => ({
  select: jest.fn(),
  dispatch: jest.fn(),
  listen: jest.fn(),
}));

const mockSelect = select as jest.MockedFunction<typeof select>;
const mockListen = listen as jest.MockedFunction<typeof listen>;
const mockGetAllDisplays = screen.getAllDisplays as jest.Mock;

const withSaved = (bounds: unknown) => {
  mockSelect.mockImplementation((selector: any) =>
    selector({ secondaryWindowStates: { downloads: bounds } })
  );
};

describe('getSavedWindowBounds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllDisplays.mockReturnValue([
      { bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
    ]);
  });

  it('returns bounds that land on a display', () => {
    withSaved({ x: 100, y: 80, width: 900, height: 600 });

    expect(getSavedWindowBounds('downloads')).toEqual({
      x: 100,
      y: 80,
      width: 900,
      height: 600,
    });
  });

  it('keeps a window that merely overlaps an edge', () => {
    withSaved({ x: -40, y: 20, width: 900, height: 600 });

    expect(getSavedWindowBounds('downloads')).not.toBeUndefined();
  });

  it('drops bounds on a display that is no longer attached', () => {
    // Saved on a second monitor that has since been unplugged.
    withSaved({ x: 3000, y: 200, width: 900, height: 600 });

    expect(getSavedWindowBounds('downloads')).toBeUndefined();
  });

  it('ignores nothing-saved and malformed entries', () => {
    withSaved(undefined);
    expect(getSavedWindowBounds('downloads')).toBeUndefined();

    withSaved({ x: 10, y: 10 });
    expect(getSavedWindowBounds('downloads')).toBeUndefined();

    withSaved({ x: 10, y: 10, width: 0, height: 600 });
    expect(getSavedWindowBounds('downloads')).toBeUndefined();

    withSaved({ x: NaN, y: 10, width: 900, height: 600 });
    expect(getSavedWindowBounds('downloads')).toBeUndefined();
  });

  it('returns nothing when the window has no saved entry', () => {
    mockSelect.mockImplementation((selector: any) =>
      selector({ secondaryWindowStates: {} })
    );

    expect(getSavedWindowBounds('settings')).toBeUndefined();
  });
});

describe('onWindowBoundsReset', () => {
  // The listen() subscription is a lazily-created module-level singleton
  // shared across every registration, so each test re-imports the module in
  // isolation to get a clean singleton instead of leaking state between tests.
  const loadModule = () => {
    let mod!: typeof SecondaryWindowStateModule;
    jest.isolateModules(() => {
      mod = require('./secondaryWindowState');
    });
    return mod;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes registered recenter callbacks when the reset action fires', () => {
    let resetListener: () => void = () => undefined;
    mockListen.mockImplementation((_type: any, listener: any) => {
      resetListener = listener;
      return jest.fn();
    });

    const { onWindowBoundsReset: register } = loadModule();
    const settingsRecenter = jest.fn();
    const downloadsRecenter = jest.fn();

    register('settings', settingsRecenter);
    register('downloads', downloadsRecenter);

    resetListener();

    expect(settingsRecenter).toHaveBeenCalledTimes(1);
    expect(downloadsRecenter).toHaveBeenCalledTimes(1);
  });

  it('only subscribes to the store once across multiple registrations', () => {
    mockListen.mockReturnValue(jest.fn());

    const { onWindowBoundsReset: register } = loadModule();
    register('settings', jest.fn());
    register('downloads', jest.fn());

    expect(mockListen).toHaveBeenCalledTimes(1);
  });

  it('unsubscribing stops that window from being recentred', () => {
    let resetListener: () => void = () => undefined;
    mockListen.mockImplementation((_type: any, listener: any) => {
      resetListener = listener;
      return jest.fn();
    });

    const { onWindowBoundsReset: register } = loadModule();
    const settingsRecenter = jest.fn();
    const unsubscribe = register('settings', settingsRecenter);

    unsubscribe();
    resetListener();

    expect(settingsRecenter).not.toHaveBeenCalled();
  });
});
