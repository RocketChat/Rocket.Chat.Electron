/** @jsx jsx */

import type { MenuItemConstructorOptions } from 'electron';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import * as flashWindowActions from '../../../common/actions/flashWindowActions';
import * as menuBarActions from '../../../common/actions/menuBarActions';
import * as rootWindowActions from '../../../common/actions/rootWindowActions';
import * as sideBarActions from '../../../common/actions/sideBarActions';
import * as trayIconActions from '../../../common/actions/trayIconActions';
import { jsx } from '../../../common/helpers/jsx/menu';
import { useAppDispatch } from '../../../common/hooks/useAppDispatch';
import { useAppSelector } from '../../../common/hooks/useAppSelector';
import { getWebContentsByServerUrl } from '../../serverView';

export const useViewMenu = (): MenuItemConstructorOptions => {
  const platform = useAppSelector((state) => state.app.platform);
  const view = useAppSelector((state) => state.ui.view);
  const flashWindowEnabled = useAppSelector(
    (state) => state.ui.flashWindow.enabled
  );
  const trayIconEnabled = useAppSelector((state) => state.ui.trayIcon.enabled);
  const menuBarEnabled = useAppSelector((state) => state.ui.menuBar.enabled);
  const sideBarEnabled = useAppSelector((state) => state.ui.sideBar.enabled);
  const fullscreen = useAppSelector(
    (state) => state.ui.rootWindow.state.fullscreen
  );
  const dispatch = useAppDispatch();

  const { t } = useTranslation();

  return useMemo<MenuItemConstructorOptions>(
    () => (
      <menuitem id='viewMenu' label={t('menus.viewMenu')}>
        <menuitem
          id='reload'
          label={t('menus.reload')}
          accelerator='CommandOrControl+R'
          enabled={typeof view === 'object' && !!view.url}
          click={async () => {
            dispatch(rootWindowActions.focused());
            const guestWebContents =
              typeof view === 'object'
                ? getWebContentsByServerUrl(view.url)
                : null;
            guestWebContents?.reload();
          }}
        />
        <menuitem
          id='reloadIgnoringCache'
          label={t('menus.reloadIgnoringCache')}
          enabled={typeof view === 'object' && !!view.url}
          click={async () => {
            dispatch(rootWindowActions.focused());
            const guestWebContents =
              typeof view === 'object'
                ? getWebContentsByServerUrl(view.url)
                : null;
            guestWebContents?.reloadIgnoringCache();
          }}
        />
        <menuitem
          id='openDevTools'
          label={t('menus.openDevTools')}
          enabled={typeof view === 'object' && !!view.url}
          accelerator={platform === 'darwin' ? 'Command+Alt+I' : 'Ctrl+Shift+I'}
          click={() => {
            const guestWebContents =
              typeof view === 'object'
                ? getWebContentsByServerUrl(view.url)
                : null;
            guestWebContents?.toggleDevTools();
          }}
        />
        <separator />
        <menuitem
          id='back'
          label={t('menus.back')}
          enabled={typeof view === 'object' && !!view.url}
          accelerator={platform === 'darwin' ? 'Command+[' : 'Alt+Left'}
          click={async () => {
            dispatch(rootWindowActions.focused());
            const guestWebContents =
              typeof view === 'object'
                ? getWebContentsByServerUrl(view.url)
                : null;
            guestWebContents?.goBack();
          }}
        />
        <menuitem
          id='forward'
          label={t('menus.forward')}
          enabled={typeof view === 'object' && !!view.url}
          accelerator={platform === 'darwin' ? 'Command+]' : 'Alt+Right'}
          click={async () => {
            dispatch(rootWindowActions.focused());
            const guestWebContents =
              typeof view === 'object'
                ? getWebContentsByServerUrl(view.url)
                : null;
            guestWebContents?.goForward();
          }}
        />
        <separator />
        <menuitem
          id='showTrayIcon'
          label={t('menus.showTrayIcon')}
          type='checkbox'
          checked={trayIconEnabled}
          click={({ checked }) => {
            dispatch(trayIconActions.toggled(checked));
          }}
        />
        <menuitem
          id='enableFlashWindow'
          label={t('menus.enableFlashWindow')}
          type='checkbox'
          checked={flashWindowEnabled}
          click={({ checked }) => {
            dispatch(flashWindowActions.toggled(checked));
          }}
        />
        {platform === 'darwin' && (
          <menu>
            <menuitem
              id='showFullScreen'
              label={t('menus.showFullScreen')}
              type='checkbox'
              checked={fullscreen}
              accelerator='Control+Command+F'
              click={async ({ checked }) => {
                dispatch(rootWindowActions.focused());
                dispatch(rootWindowActions.fullscreenToggled(checked));
              }}
            />
          </menu>
        )}
        {platform !== 'darwin' && (
          <menu>
            <menuitem
              id='showMenuBar'
              label={t('menus.showMenuBar')}
              type='checkbox'
              checked={menuBarEnabled}
              click={async ({ checked }) => {
                dispatch(rootWindowActions.focused());
                dispatch(menuBarActions.toggled(checked));
              }}
            />
          </menu>
        )}
        <menuitem
          id='showServerList'
          label={t('menus.showServerList')}
          type='checkbox'
          checked={sideBarEnabled}
          click={async ({ checked }) => {
            dispatch(rootWindowActions.focused());
            dispatch(sideBarActions.toggled(checked));
          }}
        />
        <separator />
        <menuitem
          id='resetZoom'
          label={t('menus.resetZoom')}
          accelerator='CommandOrControl+0'
          click={async () => {
            dispatch(rootWindowActions.focused());
            dispatch(rootWindowActions.zoomReset());
          }}
        />
        <menuitem
          id='zoomIn'
          label={t('menus.zoomIn')}
          accelerator='CommandOrControl+Plus'
          click={async () => {
            dispatch(rootWindowActions.focused());
            dispatch(rootWindowActions.zoomedIn());
          }}
        />
        <menuitem
          id='zoomOut'
          label={t('menus.zoomOut')}
          accelerator='CommandOrControl+-'
          click={async () => {
            dispatch(rootWindowActions.focused());
            dispatch(rootWindowActions.zoomedOut());
          }}
        />
      </menuitem>
    ),
    [
      view,
      dispatch,
      menuBarEnabled,
      sideBarEnabled,
      trayIconEnabled,
      flashWindowEnabled,
      platform,
      fullscreen,
      t,
    ]
  );
};
