import * as store from '../../store';
import { APP_SETTINGS_LOADED } from '../actions';
import { mergePersistableValues } from './data';

jest.mock('../../store');

const mockDispatch = jest.fn();
const mockSelect = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (store.dispatch as jest.Mock).mockImplementation(mockDispatch);
  (store.select as jest.Mock).mockImplementation(mockSelect);
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

    jest.doMock('./persistence', () => ({
      getPersistedValues: jest.fn().mockReturnValue({}),
    }));

    jest.doMock('fs', () => ({
      promises: {
        readFile: jest.fn().mockRejectedValue(new Error('File not found')),
        unlink: jest.fn().mockResolvedValue(undefined),
      },
    }));

    jest.doMock('electron', () => ({
      app: {
        getPath: jest.fn().mockReturnValue('/user/data'),
      },
    }));
  });

  describe('menubar recovery mechanism', () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        writable: true,
        configurable: true,
      });
    });

    it('should enable menubar on Linux when in tabs layout with menubar disabled', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        configurable: true,
      });
      const localStorage = {};

      mockSelect.mockReturnValueOnce({
        ...mockInitialValues,
        isMenuBarEnabled: false,
        navigationLayout: 'tabs',
      });

      await mergePersistableValues(localStorage);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_SETTINGS_LOADED,
        payload: expect.objectContaining({
          isMenuBarEnabled: true,
        }),
      });
    });

    it('should not modify settings on Linux when in sidebar layout with menubar disabled', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        configurable: true,
      });
      const localStorage = {};

      mockSelect.mockReturnValueOnce({
        ...mockInitialValues,
        isMenuBarEnabled: false,
        navigationLayout: 'sidebar',
      });

      await mergePersistableValues(localStorage);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_SETTINGS_LOADED,
        payload: expect.objectContaining({
          isMenuBarEnabled: false,
        }),
      });
    });

    it('should not modify settings on non-Linux platforms when in tabs layout with menubar disabled', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
        configurable: true,
      });
      const localStorage = {};

      mockSelect.mockReturnValueOnce({
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

    it('should not modify settings when menubar is already enabled', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        configurable: true,
      });
      const localStorage = {};

      mockSelect.mockReturnValueOnce({
        ...mockInitialValues,
        isMenuBarEnabled: true,
        navigationLayout: 'sidebar',
      });

      await mergePersistableValues(localStorage);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_SETTINGS_LOADED,
        payload: expect.objectContaining({
          isMenuBarEnabled: true,
        }),
      });
    });
  });

  describe('legacy localStorage migration', () => {
    it('should handle autohideMenu from localStorage', async () => {
      const localStorage = {
        autohideMenu: 'true',
      };

      mockSelect.mockReturnValueOnce({
        ...mockInitialValues,
        isMenuBarEnabled: false,
        isSideBarEnabled: false,
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

      mockSelect.mockReturnValueOnce({
        ...mockInitialValues,
        isMenuBarEnabled: false,
        isSideBarEnabled: false,
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
});
