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

  describe('menubar and sidebar recovery mechanism', () => {
    it('should enable sidebar when both menubar and sidebar are disabled', async () => {
      const localStorage = {};

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
          isSideBarEnabled: true,
        }),
      });
    });

    it('should not modify settings when menubar is enabled and sidebar is disabled', async () => {
      const localStorage = {};

      mockSelect.mockReturnValueOnce({
        ...mockInitialValues,
        isMenuBarEnabled: true,
        isSideBarEnabled: false,
      });

      await mergePersistableValues(localStorage);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_SETTINGS_LOADED,
        payload: expect.objectContaining({
          isMenuBarEnabled: true,
          isSideBarEnabled: false,
        }),
      });
    });

    it('should not modify settings when sidebar is enabled and menubar is disabled', async () => {
      const localStorage = {};

      mockSelect.mockReturnValueOnce({
        ...mockInitialValues,
        isMenuBarEnabled: false,
        isSideBarEnabled: true,
      });

      await mergePersistableValues(localStorage);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_SETTINGS_LOADED,
        payload: expect.objectContaining({
          isMenuBarEnabled: false,
          isSideBarEnabled: true,
        }),
      });
    });

    it('should not modify settings when both menubar and sidebar are enabled', async () => {
      const localStorage = {};

      mockSelect.mockReturnValueOnce({
        ...mockInitialValues,
        isMenuBarEnabled: true,
        isSideBarEnabled: true,
      });

      await mergePersistableValues(localStorage);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: APP_SETTINGS_LOADED,
        payload: expect.objectContaining({
          isMenuBarEnabled: true,
          isSideBarEnabled: true,
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
          isSideBarEnabled: true,
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
          isSideBarEnabled: true,
        }),
      });
    });
  });
});
