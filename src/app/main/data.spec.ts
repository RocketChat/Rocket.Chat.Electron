import fs from 'fs';

import * as store from '../../store';
import { MENU_BAR_DEFAULT_REVISION } from '../PersistableValues';
import { APP_SETTINGS_LOADED } from '../actions';
import { mergePersistableValues } from './data';
import {
  getPersistedMeta,
  getPersistedValues,
  setPersistedMeta,
} from './persistence';

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/user/data'),
    getVersion: jest.fn().mockReturnValue('1.0.0'),
  },
}));

jest.mock('electron-store', () => {
  return jest.fn(() => ({
    store: {},
    set: jest.fn(),
  }));
});

jest.mock('../../store');

jest.mock('./persistence', () => ({
  getPersistedValues: jest.fn().mockReturnValue({}),
  persistValues: jest.fn(),
  // Literal 1 matches MENU_BAR_DEFAULT_REVISION (jest.mock factories are hoisted).
  getPersistedMeta: jest.fn().mockReturnValue(1),
  setPersistedMeta: jest.fn(),
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockRejectedValue(new Error('File not found')),
    unlink: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/user/data'),
    getVersion: jest.fn().mockReturnValue('0.0.0'),
  },
}));

jest.mock('../../logging', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const mockDispatch = jest.fn();
const mockSelect = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (store.dispatch as jest.Mock).mockImplementation(mockDispatch);
  (store.select as jest.Mock).mockImplementation(mockSelect);
  (getPersistedValues as jest.Mock).mockReturnValue({});
  (getPersistedMeta as jest.Mock).mockReturnValue(MENU_BAR_DEFAULT_REVISION);
});

describe('mergePersistableValues', () => {
  const mockInitialValues = {
    isMenuBarEnabled: true,
    isSideBarEnabled: true,
    navigationLayout: 'tabs' as const,
    rootWindowState: {
      focused: true,
      visible: true,
      maximized: false,
      minimized: false,
      fullscreen: false,
      normal: true,
      bounds: { x: 0, y: 0, width: 1200, height: 800 },
    },
  };

  beforeEach(() => {
    mockSelect.mockReturnValue(mockInitialValues);
  });

  describe('menu bar settings (no layout coupling)', () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        writable: true,
        configurable: true,
      });
    });

    it('preserves isMenuBarEnabled=false on Linux with tabs layout (no recovery force-on)', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        configurable: true,
      });
      const localStorage = {};

      mockSelect.mockReturnValue({
        ...mockInitialValues,
        isMenuBarEnabled: false,
        navigationLayout: 'tabs',
      });

      await mergePersistableValues(localStorage);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_SETTINGS_LOADED,
        payload: expect.objectContaining({
          isMenuBarEnabled: false,
        }),
      });
    });

    it('preserves isMenuBarEnabled=false on Windows with tabs layout', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
        configurable: true,
      });
      const localStorage = {};

      mockSelect.mockReturnValue({
        ...mockInitialValues,
        isMenuBarEnabled: false,
        navigationLayout: 'tabs',
      });

      await mergePersistableValues(localStorage);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_SETTINGS_LOADED,
        payload: expect.objectContaining({
          isMenuBarEnabled: false,
        }),
      });
    });

    it('one-shot: forces isMenuBarEnabled off on Linux when menuBarDefaultRevision is stale', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        configurable: true,
      });
      (getPersistedMeta as jest.Mock).mockReturnValue(0);
      mockSelect.mockReturnValue({
        ...mockInitialValues,
        isMenuBarEnabled: true,
        navigationLayout: 'tabs',
      });

      await mergePersistableValues({});

      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_SETTINGS_LOADED,
        payload: expect.objectContaining({
          isMenuBarEnabled: false,
        }),
      });
      expect(setPersistedMeta).toHaveBeenCalledWith(
        'menuBarDefaultRevision',
        MENU_BAR_DEFAULT_REVISION
      );
    });

    it('one-shot: does not re-force isMenuBarEnabled after revision is applied', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        configurable: true,
      });
      (getPersistedMeta as jest.Mock).mockReturnValue(
        MENU_BAR_DEFAULT_REVISION
      );
      mockSelect.mockReturnValue({
        ...mockInitialValues,
        isMenuBarEnabled: true,
        navigationLayout: 'tabs',
      });

      await mergePersistableValues({});

      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_SETTINGS_LOADED,
        payload: expect.objectContaining({
          isMenuBarEnabled: true,
        }),
      });
      expect(setPersistedMeta).not.toHaveBeenCalled();
    });
  });

  describe('legacy localStorage migration', () => {
    it('should handle autohideMenu from localStorage', async () => {
      const localStorage = {
        autohideMenu: 'true',
      };

      mockSelect.mockReturnValue({
        ...mockInitialValues,
        isMenuBarEnabled: false,
        isSideBarEnabled: false,
        navigationLayout: 'sidebar',
      });

      await mergePersistableValues(localStorage);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_SETTINGS_LOADED,
        payload: expect.objectContaining({
          isMenuBarEnabled: false,
          isSideBarEnabled: false,
        }),
      });
    });

    it('should handle sidebar-closed from localStorage with recovery', async () => {
      const localStorage = {
        'sidebar-closed': 'true',
        'autohideMenu': 'true',
      };

      mockSelect.mockReturnValue({
        ...mockInitialValues,
        isMenuBarEnabled: false,
        isSideBarEnabled: false,
        navigationLayout: 'sidebar',
      });

      await mergePersistableValues(localStorage);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_SETTINGS_LOADED,
        payload: expect.objectContaining({
          isMenuBarEnabled: false,
          isSideBarEnabled: false,
        }),
      });
    });
  });

  describe('overridden settings', () => {
    it('applies isNotificationQuickReplyEnabled=false from overridden-settings.json', async () => {
      (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(
        JSON.stringify({ isNotificationQuickReplyEnabled: false })
      );

      await mergePersistableValues({});

      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_SETTINGS_LOADED,
        payload: expect.objectContaining({
          isNotificationQuickReplyEnabled: false,
        }),
      });
    });

    it('defaults isNotificationQuickReplyEnabled to true when not overridden', async () => {
      await mergePersistableValues({});

      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_SETTINGS_LOADED,
        payload: expect.objectContaining({
          isNotificationQuickReplyEnabled: true,
        }),
      });
    });
  });
});
