import { app, Menu } from 'electron';
import type {
  MenuItemConstructorOptions,
  MenuItem as ElectronMenuItem,
} from 'electron';

import { select, Service, dispatch } from '../../store';
import {
  MENU_BAR_ADD_NEW_SERVER_CLICKED,
  MENU_BAR_SELECT_SERVER_CLICKED,
} from '../actions';
import { selectGlobalBadgeText, selectGlobalBadgeCount } from '../selectors';
import { getRootWindow } from './rootWindow';

class DockService extends Service {
  protected initialize(): void {
    if (process.platform !== 'darwin') {
      return;
    }

    this.watch(selectGlobalBadgeText, (globalBadgeText) => {
      app.dock?.setBadge(globalBadgeText);
    });

    this.watch(
      selectGlobalBadgeCount,
      (globalBadgeCount, prevGlobalBadgeCount) => {
        const { isFlashFrameEnabled } = select(({ isFlashFrameEnabled }) => ({
          isFlashFrameEnabled,
        }));

        if (globalBadgeCount <= 0 || (prevGlobalBadgeCount ?? 0) > 0) {
          return;
        }

        if (isFlashFrameEnabled) {
          app.dock?.bounce();
        }
      }
    );

    // Build dock menu with workspace list and Add Workspace
    const serverItemById = new Map<string, ElectronMenuItem>();

    const buildDockMenu = () => {
      const { servers, currentView } = select(({ servers, currentView }) => ({
        servers,
        currentView,
      }));

      const template: MenuItemConstructorOptions[] = [
        ...servers.map(
          (server, i): MenuItemConstructorOptions => ({
            id: server.url,
            type: 'checkbox',
            label: server.title?.replace(/&/g, '&&'),
            checked:
              typeof currentView === 'object' && currentView.url === server.url,
            accelerator: `CommandOrControl+${i + 1}`,
            click: async () => {
              // Switch view first, then bring window to front immediately
              dispatch({
                type: MENU_BAR_SELECT_SERVER_CLICKED,
                payload: server.url,
              });
              const browserWindow = await getRootWindow();
              if (browserWindow.isMinimized()) {
                browserWindow.restore();
                browserWindow.focus();
              } else if (!browserWindow.isVisible()) {
                browserWindow.show();
                browserWindow.focus();
              } else {
                browserWindow.focus();
              }
            },
          })
        ),
        { type: 'separator' },
        {
          id: 'dockAddWorkspace',
          label: 'Add Workspace',
          accelerator: 'CommandOrControl+N',
          click: async () => {
            dispatch({ type: MENU_BAR_ADD_NEW_SERVER_CLICKED });
            const browserWindow = await getRootWindow();
            if (browserWindow.isMinimized()) {
              browserWindow.restore();
              browserWindow.focus();
            } else if (!browserWindow.isVisible()) {
              browserWindow.show();
              browserWindow.focus();
            } else {
              browserWindow.focus();
            }
          },
        },
      ];

      const menu = Menu.buildFromTemplate(template);
      serverItemById.clear();
      servers.forEach((s) => {
        const item = menu.getMenuItemById(s.url);
        if (item) {
          serverItemById.set(s.url, item);
        }
      });
      app.dock?.setMenu(menu);
    };

    buildDockMenu();
    this.watch(
      ({ servers }) => servers,
      () => {
        buildDockMenu();
      }
    );

    this.watch(
      ({ currentView }) => currentView,
      (currentView) => {
        const selectedUrl =
          typeof currentView === 'object' ? currentView.url : undefined;
        serverItemById.forEach((item, url) => {
          item.checked = selectedUrl === url;
        });
      }
    );
  }
}

export default new DockService();
