import type { MenuItemConstructorOptions } from 'electron';

import { DOWNLOADS_SIMULATION_REQUESTED } from '../../downloads/actions';
import type { Server } from '../../servers/common';
import { dispatch } from '../../store';
import type { RootState } from '../../store/rootReducer';
import {
  UPDATES_CHECK_FOR_UPDATES_REQUESTED,
  UPDATES_SIMULATION_REQUESTED,
} from '../../updates/actions';
import {
  MENU_BAR_SET_NAVIGATION_LAYOUT_CLICKED,
  SET_PRESENCE_DISCONNECTION_SIMULATED,
} from '../actions';
import {
  getServerContextMenuTemplate,
  selectAppMenuPopupTemplate,
  selectMenuBarTemplate,
  selectMenuBarTemplateAsJson,
  selectServerSwitcherMenuTemplate,
} from './menuBar';
import { getRootWindow } from './rootWindow';

jest.mock('electron', () => ({
  app: {
    name: 'Rocket.Chat',
    quit: jest.fn(),
    commandLine: { hasSwitch: jest.fn(() => false) },
    getPath: jest.fn(() => ''),
    showAboutPanel: jest.fn(),
  },
  shell: {
    showItemInFolder: jest.fn(),
    openExternal: jest.fn(),
  },
  BrowserWindow: {
    getAllWindows: jest.fn(() => []),
    getFocusedWindow: jest.fn(() => null),
  },
  Menu: {
    buildFromTemplate: jest.fn((template) => ({
      popup: jest.fn(),
      template,
    })),
    setApplicationMenu: jest.fn(),
  },
}));

jest.mock('i18next', () => ({
  t: (key: string, opts?: { appName?: string }) =>
    opts?.appName ? `${key}:${opts.appName}` : key,
}));

jest.mock('../../app/main/app', () => ({
  relaunchApp: jest.fn(),
}));

jest.mock('../../utils/browserLauncher', () => ({
  openExternal: jest.fn(),
}));

jest.mock('../../videoCallWindow/ipc', () => ({
  openVideoCallWebviewDevTools: jest.fn(),
}));

jest.mock('./dialogs', () => ({
  askForAppDataReset: jest.fn().mockResolvedValue(false),
}));

const mockBrowserWindow = {
  isVisible: jest.fn(() => true),
  showInactive: jest.fn(),
  show: jest.fn(),
  focus: jest.fn(),
  hide: jest.fn(),
  minimize: jest.fn(),
  maximize: jest.fn(),
  unmaximize: jest.fn(),
  close: jest.fn(),
  isFullScreen: jest.fn(() => false),
  setFullScreen: jest.fn(),
  getNormalBounds: jest.fn(() => ({ x: 0, y: 0, width: 1000, height: 600 })),
  getBounds: jest.fn(() => ({ x: 0, y: 0, width: 1000, height: 600 })),
  webContents: {
    openDevTools: jest.fn(),
    toggleDevTools: jest.fn(),
    reload: jest.fn(),
    reloadIgnoringCache: jest.fn(),
    goBack: jest.fn(),
    goForward: jest.fn(),
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
    setZoomLevel: jest.fn(),
    getZoomLevel: jest.fn(() => 0),
  },
  setMenu: jest.fn(),
  setMenuBarVisibility: jest.fn(),
  autoHideMenuBar: false,
};

jest.mock('./rootWindow', () => ({
  getRootWindow: jest.fn(async () => mockBrowserWindow),
}));

jest.mock('./serverView', () => ({
  getWebContentsByServerUrl: jest.fn(() => ({
    reload: jest.fn(),
    reloadIgnoringCache: jest.fn(),
    openDevTools: jest.fn(),
  })),
}));

const createServer = (
  url: string,
  title: string,
  extras: Partial<Server> = {}
): Server => ({
  url,
  title,
  ...extras,
});

const createState = (overrides: Partial<RootState> = {}): RootState =>
  ({
    servers: [],
    currentView: 'downloads',
    isTrayIconEnabled: true,
    isMenuBarEnabled: true,
    isAddNewServersEnabled: true,
    isShowWindowOnUnreadChangedEnabled: false,
    isDeveloperModeEnabled: true,
    isVideoCallDevtoolsAutoOpenEnabled: false,
    isPresenceDisconnectionSimulated: false,
    navigationLayout: 'tabs',
    rootWindowState: {
      focused: true,
      visible: true,
      maximized: false,
      minimized: false,
      fullscreen: false,
      normal: true,
      bounds: { x: undefined, y: undefined, width: 1000, height: 600 },
    },
    ...overrides,
  }) as RootState;

jest.mock('../../store', () => ({
  dispatch: jest.fn(),
  select: jest.fn((selector: (state: any) => unknown) =>
    selector({
      servers: [],
      currentView: 'downloads',
      isTrayIconEnabled: true,
      isMenuBarEnabled: true,
      isAddNewServersEnabled: true,
      isShowWindowOnUnreadChangedEnabled: false,
      isDeveloperModeEnabled: true,
      isVideoCallDevtoolsAutoOpenEnabled: false,
      isPresenceDisconnectionSimulated: false,
      navigationLayout: 'tabs',
      rootWindowState: {
        focused: true,
        visible: true,
        maximized: false,
        minimized: false,
        fullscreen: false,
        normal: true,
        bounds: { x: undefined, y: undefined, width: 1000, height: 600 },
      },
    })
  ),
  Service: class Service {
    protected initialize(): void {}

    setUp(): void {
      this.initialize();
    }
  },
  watch: jest.fn(),
  listen: jest.fn(),
}));

const findMenu = (
  template: MenuItemConstructorOptions[],
  id: string
): MenuItemConstructorOptions => {
  const menu = template.find((item) => item.id === id);
  if (!menu) {
    throw new Error(`Menu with id "${id}" not found`);
  }
  return menu;
};

const collectClickableItems = (
  items: MenuItemConstructorOptions[] | undefined,
  acc: MenuItemConstructorOptions[] = []
): MenuItemConstructorOptions[] => {
  if (!items) return acc;
  for (const item of items) {
    if (typeof item.click === 'function') {
      acc.push(item);
    }
    if (Array.isArray(item.submenu)) {
      collectClickableItems(item.submenu, acc);
    }
  }
  return acc;
};

describe('ui/main/menuBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getRootWindow as jest.Mock).mockResolvedValue(mockBrowserWindow);
    mockBrowserWindow.isVisible.mockReturnValue(true);
    mockBrowserWindow.isFullScreen.mockReturnValue(false);
  });

  describe('selectMenuBarTemplateAsJson', () => {
    it('differs between a 1-server state and a 2-server state', () => {
      const oneServerState = createState({
        servers: [createServer('https://one.example', 'One')],
      });
      const twoServerState = createState({
        servers: [
          createServer('https://one.example', 'One'),
          createServer('https://two.example', 'Two'),
        ],
      });

      const oneServerJson = selectMenuBarTemplateAsJson(oneServerState);
      const twoServerJson = selectMenuBarTemplateAsJson(twoServerState);

      expect(oneServerJson).toBeDefined();
      expect(twoServerJson).toBeDefined();
      expect(oneServerJson).not.toEqual(twoServerJson);
    });
  });

  describe('Window menu', () => {
    it('lists per-server items with accelerators matching server order', () => {
      const state = createState({
        servers: [
          createServer('https://one.example', 'One'),
          createServer('https://two.example', 'Two'),
          createServer('https://three.example', 'Three'),
        ],
      });

      const template = selectMenuBarTemplate(state);
      const windowMenu = findMenu(
        template as MenuItemConstructorOptions[],
        'windowMenu'
      );
      const submenu = windowMenu.submenu as MenuItemConstructorOptions[];

      const serverItems = state.servers.map((server) =>
        submenu.find((item) => item.id === server.url)
      );

      serverItems.forEach((item, index) => {
        expect(item).toBeDefined();
        expect(item?.accelerator).toBe(`CommandOrControl+${index + 1}`);
      });
    });
  });

  describe('View menu', () => {
    it('contains workspaceTabs and workspaceBar items with checked state following navigationLayout', () => {
      const tabsState = createState({ navigationLayout: 'tabs' });
      const sidebarState = createState({ navigationLayout: 'sidebar' });

      const tabsTemplate = selectMenuBarTemplate(tabsState);
      const sidebarTemplate = selectMenuBarTemplate(sidebarState);

      const tabsViewMenu = findMenu(
        tabsTemplate as MenuItemConstructorOptions[],
        'viewMenu'
      );
      const sidebarViewMenu = findMenu(
        sidebarTemplate as MenuItemConstructorOptions[],
        'viewMenu'
      );

      const tabsSubmenu = tabsViewMenu.submenu as MenuItemConstructorOptions[];
      const sidebarSubmenu =
        sidebarViewMenu.submenu as MenuItemConstructorOptions[];

      const workspaceTabsInTabsState = tabsSubmenu.find(
        (item) => item.id === 'workspaceTabs'
      );
      const workspaceBarInTabsState = tabsSubmenu.find(
        (item) => item.id === 'workspaceBar'
      );
      expect(workspaceTabsInTabsState?.checked).toBe(true);
      expect(workspaceBarInTabsState?.checked).toBe(false);

      const workspaceTabsInSidebarState = sidebarSubmenu.find(
        (item) => item.id === 'workspaceTabs'
      );
      const workspaceBarInSidebarState = sidebarSubmenu.find(
        (item) => item.id === 'workspaceBar'
      );
      expect(workspaceTabsInSidebarState?.checked).toBe(false);
      expect(workspaceBarInSidebarState?.checked).toBe(true);
    });

    it('puts the layout shortcut on the next step of the cycle, and clicking it advances the cycle', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { dispatch } = require('../../store');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getRootWindow } = require('./rootWindow');
      (getRootWindow as jest.Mock).mockResolvedValue({
        isVisible: () => true,
        showInactive: jest.fn(),
        focus: jest.fn(),
      });

      const layoutRadios: Record<
        'tabs' | 'sidebar' | 'hidden',
        'workspaceTabs' | 'workspaceBar' | 'workspaceHidden'
      > = {
        tabs: 'workspaceTabs',
        sidebar: 'workspaceBar',
        hidden: 'workspaceHidden',
      };

      const getRadios = (
        current: 'tabs' | 'sidebar' | 'hidden'
      ): MenuItemConstructorOptions[] => {
        const template = selectMenuBarTemplate(
          createState({ navigationLayout: current })
        );
        const viewMenu = findMenu(
          template as MenuItemConstructorOptions[],
          'viewMenu'
        );
        return viewMenu.submenu as MenuItemConstructorOptions[];
      };

      const expectNext = async (
        current: 'tabs' | 'sidebar' | 'hidden',
        next: 'tabs' | 'sidebar' | 'hidden'
      ): Promise<void> => {
        const submenu = getRadios(current);
        const byId = (id: string) => submenu.find((item) => item.id === id);

        // Only the next-step radio carries the shortcut; the others are bare.
        expect(byId(layoutRadios[next])?.accelerator).toBeDefined();
        (['tabs', 'sidebar', 'hidden'] as const)
          .filter((layout) => layout !== next)
          .forEach((layout) => {
            expect(byId(layoutRadios[layout])?.accelerator).toBeUndefined();
          });

        // Triggering the shortcut-bearing radio moves the cycle forward.
        (dispatch as jest.Mock).mockClear();
        await (byId(layoutRadios[next])?.click as any)();
        expect(dispatch).toHaveBeenLastCalledWith({
          type: MENU_BAR_SET_NAVIGATION_LAYOUT_CLICKED,
          payload: next,
        });
      };

      await expectNext('tabs', 'sidebar');
      await expectNext('sidebar', 'hidden');
      await expectNext('hidden', 'tabs');
    });

    it('reflects developer mode and tray toggles', () => {
      const state = createState({
        isDeveloperModeEnabled: true,
        isTrayIconEnabled: false,
        isShowWindowOnUnreadChangedEnabled: true,
        isMenuBarEnabled: false,
      });
      const template = selectMenuBarTemplate(state);
      const viewMenu = findMenu(
        template as MenuItemConstructorOptions[],
        'viewMenu'
      );
      const submenu = viewMenu.submenu as MenuItemConstructorOptions[];
      const ids = submenu.map((item) => item.id).filter(Boolean);

      // Platform-dependent items may be omitted; assert those that exist.
      const tray = submenu.find((item) => item.id === 'showTrayIcon');
      if (tray) expect(tray.checked).toBe(false);
      const menuBar = submenu.find((item) => item.id === 'showMenuBar');
      if (menuBar) expect(menuBar.checked).toBe(false);
      const unread = submenu.find((item) => item.id === 'showOnUnreadMessage');
      if (unread) expect(unread.checked).toBe(true);
      expect(ids.length).toBeGreaterThan(3);
    });
  });

  describe('server switcher menu', () => {
    it('lists servers with accelerators plus settings/downloads/add-server', () => {
      const state = createState({
        servers: [
          createServer('https://a.rocket.chat/', 'Server A'),
          createServer('https://b.rocket.chat/', 'Server B'),
        ],
        currentView: { url: 'https://a.rocket.chat/' },
        isAddNewServersEnabled: true,
      });

      const template = selectServerSwitcherMenuTemplate(state);
      const ids = template.map((item) => item.id);

      expect(ids).toEqual(
        expect.arrayContaining([
          'https://a.rocket.chat/',
          'https://b.rocket.chat/',
          'settings',
          'downloads',
          'addNewServer',
        ])
      );

      const serverA = template.find(
        (item) => item.id === 'https://a.rocket.chat/'
      );
      expect(serverA?.accelerator).toBe('CommandOrControl+1');
      expect(serverA?.checked).toBe(true);

      const serverB = template.find(
        (item) => item.id === 'https://b.rocket.chat/'
      );
      expect(serverB?.accelerator).toBe('CommandOrControl+2');
      expect(serverB?.checked).toBe(false);
    });

    it('includes checkForUpdates and dispatches on click when updating is allowed and enabled', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { dispatch } = require('../../store');
      const state = createState({
        isDeveloperModeEnabled: false,
        isUpdatingAllowed: true,
        isUpdatingEnabled: true,
        updateStore: null,
      });
      const template = selectServerSwitcherMenuTemplate(state);

      const checkForUpdates = findMenu(template, 'checkForUpdates');
      await (checkForUpdates.click as any)();

      expect(dispatch).toHaveBeenCalledWith({
        type: UPDATES_CHECK_FOR_UPDATES_REQUESTED,
      });
    });

    it('includes checkForUpdates for a store build even when isUpdatingAllowed is false', () => {
      const state = createState({
        isDeveloperModeEnabled: false,
        isUpdatingAllowed: false,
        isUpdatingEnabled: false,
        updateStore: 'mas',
      });
      const template = selectServerSwitcherMenuTemplate(state);
      const ids = template.map((item) => item.id);

      expect(ids).toContain('checkForUpdates');
    });

    it('omits checkForUpdates when updating is neither allowed nor store-distributed (e.g. Linux deb/rpm/tar.gz)', () => {
      const state = createState({
        isDeveloperModeEnabled: false,
        isUpdatingAllowed: false,
        isUpdatingEnabled: true,
        updateStore: null,
      });
      const template = selectServerSwitcherMenuTemplate(state);
      const ids = template.map((item) => item.id);

      expect(ids).not.toContain('checkForUpdates');
    });

    it('omits checkForUpdates when updating is allowed but admin-disabled (isUpdatingEnabled: false) on a non-store build', () => {
      const state = createState({
        isDeveloperModeEnabled: false,
        isUpdatingAllowed: true,
        isUpdatingEnabled: false,
        updateStore: null,
      });
      const template = selectServerSwitcherMenuTemplate(state);
      const ids = template.map((item) => item.id);

      expect(ids).not.toContain('checkForUpdates');
    });

    it('omits simulate items when developer mode is off', () => {
      const state = createState({ isDeveloperModeEnabled: false });
      const template = selectServerSwitcherMenuTemplate(state);
      const ids = template.map((item) => item.id);

      expect(ids).not.toContain('simulateUpdate');
      expect(ids).not.toContain('simulateDownload');
      expect(ids).not.toContain('simulateDisconnected');
    });

    it('lists simulate items right after checkForUpdates when developer mode is on and dispatches on click', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { dispatch } = require('../../store');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getRootWindow } = require('./rootWindow');
      (getRootWindow as jest.Mock).mockResolvedValue({
        isVisible: () => true,
        showInactive: jest.fn(),
        focus: jest.fn(),
      });

      const state = createState({
        isDeveloperModeEnabled: true,
        isUpdatingAllowed: true,
        isUpdatingEnabled: true,
        updateStore: null,
      });
      const template = selectServerSwitcherMenuTemplate(state);
      const ids = template.map((item) => item.id);

      const checkForUpdatesIndex = ids.indexOf('checkForUpdates');
      expect(checkForUpdatesIndex).toBeGreaterThanOrEqual(0);
      expect(template[checkForUpdatesIndex + 1]?.type).toBe('separator');
      expect(ids[checkForUpdatesIndex + 2]).toBe('simulateUpdate');
      expect(ids[checkForUpdatesIndex + 3]).toBe('simulateDownload');
      expect(ids[checkForUpdatesIndex + 4]).toBe('simulateDisconnected');

      const simulateUpdate = findMenu(template, 'simulateUpdate');
      await (simulateUpdate.click as any)();
      expect(dispatch).toHaveBeenCalledWith({
        type: UPDATES_SIMULATION_REQUESTED,
      });

      const simulateDownload = findMenu(template, 'simulateDownload');
      await (simulateDownload.click as any)();
      expect(dispatch).toHaveBeenCalledWith({
        type: DOWNLOADS_SIMULATION_REQUESTED,
      });

      const simulateDisconnected = findMenu(template, 'simulateDisconnected');
      expect(simulateDisconnected.type).toBe('checkbox');
      expect(simulateDisconnected.checked).toBe(false);
      await (simulateDisconnected.click as any)();
      expect(dispatch).toHaveBeenCalledWith({
        type: SET_PRESENCE_DISCONNECTION_SIMULATED,
        payload: true,
      });
    });

    it('reflects the checked state of the simulate disconnected item from the store', () => {
      const state = createState({
        isDeveloperModeEnabled: true,
        isPresenceDisconnectionSimulated: true,
      });
      const template = selectServerSwitcherMenuTemplate(state);
      const simulateDisconnected = findMenu(template, 'simulateDisconnected');
      expect(simulateDisconnected.checked).toBe(true);
    });
  });

  describe('selectAppMenuPopupTemplate', () => {
    const originalPlatform = process.platform;

    const setPlatform = (platform: NodeJS.Platform): void => {
      Object.defineProperty(process, 'platform', { value: platform });
    };

    afterEach(() => {
      setPlatform(originalPlatform);
    });

    (['darwin', 'win32'] as const).forEach((platform) => {
      describe(`on ${platform}`, () => {
        beforeEach(() => {
          setPlatform(platform);
        });

        it('omits simulate items and the extra separator when developer mode is off', () => {
          const state = createState({ isDeveloperModeEnabled: false });
          const template = selectAppMenuPopupTemplate(state);
          const ids = template.map((item) => item.id);

          expect(ids).not.toContain('simulateUpdate');
          expect(ids).not.toContain('simulateDownload');
          expect(ids).not.toContain('simulateDisconnected');
        });

        it('lists simulate items right after checkForUpdates when developer mode is on', () => {
          const state = createState({
            isDeveloperModeEnabled: true,
            isUpdatingAllowed: true,
            isUpdatingEnabled: true,
            updateStore: null,
          });
          const template = selectAppMenuPopupTemplate(state);
          const ids = template.map((item) => item.id);

          const checkForUpdatesIndex = ids.indexOf('checkForUpdates');
          expect(checkForUpdatesIndex).toBeGreaterThanOrEqual(0);
          expect(template[checkForUpdatesIndex + 1]?.type).toBe('separator');
          expect(ids[checkForUpdatesIndex + 2]).toBe('simulateUpdate');
          expect(ids[checkForUpdatesIndex + 3]).toBe('simulateDownload');
          expect(ids[checkForUpdatesIndex + 4]).toBe('simulateDisconnected');
        });

        it('includes checkForUpdates when updating is allowed and enabled', () => {
          const state = createState({
            isUpdatingAllowed: true,
            isUpdatingEnabled: true,
            updateStore: null,
          });
          const template = selectAppMenuPopupTemplate(state);
          const ids = template.map((item) => item.id);

          expect(ids).toContain('checkForUpdates');
        });

        it('includes checkForUpdates for a store build even when isUpdatingAllowed is false', () => {
          const state = createState({
            isUpdatingAllowed: false,
            isUpdatingEnabled: false,
            updateStore: 'mas',
          });
          const template = selectAppMenuPopupTemplate(state);
          const ids = template.map((item) => item.id);

          expect(ids).toContain('checkForUpdates');
        });

        it('omits checkForUpdates when updating is neither allowed nor store-distributed (e.g. Linux deb/rpm/tar.gz)', () => {
          const state = createState({
            isUpdatingAllowed: false,
            isUpdatingEnabled: true,
            updateStore: null,
          });
          const template = selectAppMenuPopupTemplate(state);
          const ids = template.map((item) => item.id);

          expect(ids).not.toContain('checkForUpdates');
        });

        it('omits checkForUpdates when updating is allowed but admin-disabled (isUpdatingEnabled: false) on a non-store build', () => {
          const state = createState({
            isUpdatingAllowed: true,
            isUpdatingEnabled: false,
            updateStore: null,
          });
          const template = selectAppMenuPopupTemplate(state);
          const ids = template.map((item) => item.id);

          expect(ids).not.toContain('checkForUpdates');
        });
      });
    });
  });

  describe('server context menu', () => {
    const servers = [createServer('https://a.rocket.chat/', 'Server A')];

    it('offers the per-server actions with shortcuts on the ones that have them', () => {
      const template = getServerContextMenuTemplate(
        'https://a.rocket.chat/',
        servers,
        true
      );
      const ids = template.map((item) => item.id);

      expect(ids).toEqual(
        expect.arrayContaining([
          'reload',
          'reloadClearingCache',
          'copyCurrentUrl',
          'openDevTools',
          'serverInfo',
          'remove',
          'addWorkspace',
        ])
      );

      const byId = (id: string) => template.find((item) => item.id === id);
      expect(byId('reload')?.accelerator).toBe('CommandOrControl+R');
      expect(byId('openDevTools')?.accelerator).toBeDefined();
      expect(byId('addWorkspace')?.accelerator).toBe('CommandOrControl+N');
      // Actions without an app-level shortcut stay bare.
      expect(byId('copyCurrentUrl')?.accelerator).toBeUndefined();
      expect(byId('serverInfo')?.accelerator).toBeUndefined();
    });

    it('isolates Remove with a separator and omits Add workspace when disabled', () => {
      const template = getServerContextMenuTemplate(
        'https://a.rocket.chat/',
        servers,
        false
      );
      const ids = template.map((item) => item.id);

      expect(ids).not.toContain('addWorkspace');

      const removeIndex = template.findIndex((item) => item.id === 'remove');
      expect(template[removeIndex - 1]?.type).toBe('separator');
    });
  });

  describe('full template coverage', () => {
    it('builds app/edit/view/window/help menus for multi-server developer state', () => {
      const state = createState({
        servers: [
          createServer('https://one.example', 'One', { badge: 3 }),
          createServer('https://two.example', 'Two', { failed: true }),
        ],
        currentView: { url: 'https://one.example' },
        isAddNewServersEnabled: true,
        isDeveloperModeEnabled: true,
        isVideoCallDevtoolsAutoOpenEnabled: true,
        rootWindowState: {
          focused: true,
          visible: true,
          maximized: true,
          minimized: false,
          fullscreen: false,
          normal: false,
          bounds: { x: 0, y: 0, width: 1200, height: 800 },
        },
      });

      const template = selectMenuBarTemplate(
        state
      ) as MenuItemConstructorOptions[];
      expect(template.map((item) => item.id)).toEqual(
        expect.arrayContaining([
          'appMenu',
          'editMenu',
          'viewMenu',
          'windowMenu',
          'helpMenu',
        ])
      );

      const clickables = collectClickableItems(template);
      expect(clickables.length).toBeGreaterThan(15);
    });

    it('invokes click handlers without throwing for common menu actions', async () => {
      const state = createState({
        servers: [
          createServer('https://one.example', 'One'),
          createServer('https://two.example', 'Two'),
        ],
        currentView: { url: 'https://one.example' },
        isAddNewServersEnabled: true,
        isDeveloperModeEnabled: true,
      });

      const template = selectMenuBarTemplate(
        state
      ) as MenuItemConstructorOptions[];
      const clickables = collectClickableItems(template);

      const errors: Array<{ id: unknown; error: unknown }> = [];
      for (const item of clickables) {
        try {
          // Handlers must run sequentially to avoid overlapping shared mock
          // state (e.g. mockBrowserWindow.isVisible toggling mid-iteration).
          // eslint-disable-next-line no-await-in-loop
          await Promise.resolve(
            item.click?.({} as any, mockBrowserWindow as any, {} as any)
          );
        } catch (error) {
          // All handlers are backed by fully mocked dependencies
          // (getRootWindow, dispatch, shell, app, BrowserWindow,
          // openExternal, relaunchApp, askForAppDataReset,
          // getWebContentsByServerUrl); none are expected to throw here.
          errors.push({ id: item.id, error });
        }
      }

      expect(errors).toEqual([]);
      expect(dispatch).toHaveBeenCalled();
      expect(getRootWindow).toHaveBeenCalled();
    });

    it('builds selectAppMenuPopupTemplate and runs its click handlers', async () => {
      const state = createState({
        servers: [createServer('https://one.example', 'One')],
        isAddNewServersEnabled: true,
      });
      const template = selectAppMenuPopupTemplate(state);
      expect(template.find((item) => item.id === 'settings')).toBeDefined();
      expect(template.find((item) => item.id === 'downloads')).toBeDefined();
      expect(
        template.find((item) => item.id === 'checkForUpdates')
      ).toBeDefined();

      const clickables = collectClickableItems(template);
      const errors: Array<{ id: unknown; error: unknown }> = [];
      for (const item of clickables) {
        try {
          // Handlers must run sequentially to avoid overlapping shared mock
          // state (see note in the previous test).
          // eslint-disable-next-line no-await-in-loop
          await Promise.resolve(
            item.click?.({} as any, mockBrowserWindow as any, {} as any)
          );
        } catch (error) {
          // All handlers are backed by fully mocked dependencies; none are
          // expected to throw here (see note in the previous test).
          errors.push({ id: item.id, error });
        }
      }

      expect(errors).toEqual([]);
      expect(dispatch).toHaveBeenCalled();
    });

    it('shows inactive root window before focusing when hidden', async () => {
      // Use windowMenu's 'settings' item: it carries the same
      // show-if-hidden-then-focus behavior as the darwin-only 'about'/
      // 'preferences' items, but unlike those, it is registered on every
      // platform — selectMenuBarTemplate is memoized per createSelector, so a
      // test-local process.platform override can't force recomputation of a
      // platform-gated item already cached under the runner's real platform.
      mockBrowserWindow.isVisible.mockReturnValue(false);
      const state = createState({
        isAddNewServersEnabled: true,
      });
      const template = selectMenuBarTemplate(
        state
      ) as MenuItemConstructorOptions[];
      const windowMenu = findMenu(template, 'windowMenu');
      const settings = (
        windowMenu.submenu as MenuItemConstructorOptions[]
      ).find((item) => item.id === 'settings');
      expect(settings).toBeDefined();
      await settings?.click?.({} as any, mockBrowserWindow as any, {} as any);
      expect(mockBrowserWindow.showInactive).toHaveBeenCalled();
      expect(mockBrowserWindow.focus).toHaveBeenCalled();
    });
  });
});
