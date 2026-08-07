import type { MenuItemConstructorOptions } from 'electron';

import { DOWNLOADS_SIMULATION_REQUESTED } from '../../downloads/actions';
import type { Server } from '../../servers/common';
import type { RootState } from '../../store/rootReducer';
import {
  UPDATES_CHECK_FOR_UPDATES_REQUESTED,
  UPDATES_SIMULATION_REQUESTED,
} from '../../updates/actions';
import { MENU_BAR_SET_NAVIGATION_LAYOUT_CLICKED } from '../actions';
import {
  getServerContextMenuTemplate,
  selectAppMenuPopupTemplate,
  selectMenuBarTemplate,
  selectMenuBarTemplateAsJson,
  selectServerSwitcherMenuTemplate,
} from './menuBar';

jest.mock('electron', () => ({
  app: {
    name: 'Rocket.Chat',
    commandLine: { hasSwitch: jest.fn(() => false) },
    getPath: jest.fn(() => ''),
  },
  shell: {
    showItemInFolder: jest.fn(),
  },
  BrowserWindow: {
    getAllWindows: jest.fn(() => []),
    getFocusedWindow: jest.fn(() => null),
  },
  Menu: {
    buildFromTemplate: jest.fn(),
    setApplicationMenu: jest.fn(),
  },
}));

jest.mock('i18next', () => ({
  t: (key: string) => key,
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
  askForAppDataReset: jest.fn(),
}));

jest.mock('./rootWindow', () => ({
  getRootWindow: jest.fn(),
}));

jest.mock('./serverView', () => ({
  getWebContentsByServerUrl: jest.fn(),
}));

jest.mock('../../store', () => ({
  dispatch: jest.fn(),
  select: jest.fn(),
  Service: class Service {
    protected initialize(): void {}

    setUp(): void {
      this.initialize();
    }
  },
}));

const createServer = (url: string, title: string): Server => ({
  url,
  title,
});

const createState = (overrides: Partial<RootState> = {}): RootState =>
  ({
    servers: [],
    currentView: 'downloads',
    isTrayIconEnabled: true,
    isMenuBarEnabled: true,
    isAddNewServersEnabled: true,
    isShowWindowOnUnreadChangedEnabled: false,
    isDeveloperModeEnabled: false,
    isVideoCallDevtoolsAutoOpenEnabled: false,
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

describe('ui/main/menuBar', () => {
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

    it('always includes checkForUpdates and dispatches on click', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { dispatch } = require('../../store');
      const state = createState({ isDeveloperModeEnabled: false });
      const template = selectServerSwitcherMenuTemplate(state);

      const checkForUpdates = findMenu(template, 'checkForUpdates');
      await (checkForUpdates.click as any)();

      expect(dispatch).toHaveBeenCalledWith({
        type: UPDATES_CHECK_FOR_UPDATES_REQUESTED,
      });
    });

    it('omits simulate items when developer mode is off', () => {
      const state = createState({ isDeveloperModeEnabled: false });
      const template = selectServerSwitcherMenuTemplate(state);
      const ids = template.map((item) => item.id);

      expect(ids).not.toContain('simulateUpdate');
      expect(ids).not.toContain('simulateDownload');
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

      const state = createState({ isDeveloperModeEnabled: true });
      const template = selectServerSwitcherMenuTemplate(state);
      const ids = template.map((item) => item.id);

      const checkForUpdatesIndex = ids.indexOf('checkForUpdates');
      expect(checkForUpdatesIndex).toBeGreaterThanOrEqual(0);
      expect(template[checkForUpdatesIndex + 1]?.type).toBe('separator');
      expect(ids[checkForUpdatesIndex + 2]).toBe('simulateUpdate');
      expect(ids[checkForUpdatesIndex + 3]).toBe('simulateDownload');

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
        });

        it('lists simulate items right after checkForUpdates when developer mode is on', () => {
          const state = createState({ isDeveloperModeEnabled: true });
          const template = selectAppMenuPopupTemplate(state);
          const ids = template.map((item) => item.id);

          const checkForUpdatesIndex = ids.indexOf('checkForUpdates');
          expect(checkForUpdatesIndex).toBeGreaterThanOrEqual(0);
          expect(template[checkForUpdatesIndex + 1]?.type).toBe('separator');
          expect(ids[checkForUpdatesIndex + 2]).toBe('simulateUpdate');
          expect(ids[checkForUpdatesIndex + 3]).toBe('simulateDownload');
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
});
