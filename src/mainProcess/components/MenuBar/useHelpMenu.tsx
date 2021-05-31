/** @jsx jsx */

import { MenuItemConstructorOptions, shell } from 'electron';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import * as certificatesActions from '../../../common/actions/certificatesActions';
import * as dialogActions from '../../../common/actions/dialogActions';
import * as rootWindowActions from '../../../common/actions/rootWindowActions';
import { jsx } from '../../../common/helpers/jsx/menu';
import { useAppDispatch } from '../../../common/hooks/useAppDispatch';
import { useAppSelector } from '../../../common/hooks/useAppSelector';
import { askForAppDataReset } from '../../dialogs';
import { relaunchApp } from '../../relaunchApp';

export const useHelpMenu = (): MenuItemConstructorOptions => {
  const appName = useAppSelector((state) => state.app.name);
  const platform = useAppSelector((state) => state.app.platform);
  const devToolsOpen = useAppSelector(
    (state) => state.ui.rootWindow.devToolsOpen
  );
  const dispatch = useAppDispatch();

  const { t } = useTranslation();

  return useMemo<MenuItemConstructorOptions>(
    () => (
      <menuitem id='helpMenu' label={t('menus.helpMenu')} role='help'>
        <menuitem
          id='documentation'
          label={t('menus.documentation')}
          click={() => {
            shell.openExternal('https://docs.rocket.chat/');
          }}
        />
        <menuitem
          id='reportIssue'
          label={t('menus.reportIssue')}
          click={() => {
            shell.openExternal(
              'https://github.com/RocketChat/Rocket.Chat/issues/new'
            );
          }}
        />
        <separator />
        <menuitem
          id='reload-window'
          label={t('menus.reload')}
          accelerator='CommandOrControl+Shift+R'
          click={async () => {
            dispatch(rootWindowActions.focused());
            dispatch(rootWindowActions.reloaded());
          }}
        />
        <menuitem
          id='toggleDevTools'
          label={t('menus.toggleDevTools')}
          type='checkbox'
          checked={devToolsOpen}
          click={async () => {
            dispatch(rootWindowActions.focused());
            dispatch(rootWindowActions.devToolsToggled(!devToolsOpen));
          }}
        />
        <separator />
        <menuitem
          id='clearTrustedCertificates'
          label={t('menus.clearTrustedCertificates')}
          click={async () => {
            dispatch(rootWindowActions.focused());
            dispatch(certificatesActions.cleared());
          }}
        />
        <menuitem
          id='resetAppData'
          label={t('menus.resetAppData')}
          click={async () => {
            const permitted = await askForAppDataReset();

            if (permitted) {
              relaunchApp('--reset-app-data');
            }
          }}
        />
        <separator />
        <menuitem
          id='learnMore'
          label={t('menus.learnMore')}
          click={() => {
            shell.openExternal('https://rocket.chat');
          }}
        />
        {platform !== 'darwin' && (
          <menu>
            <menuitem
              id='about'
              label={t('menus.about', { appName })}
              click={async () => {
                dispatch(rootWindowActions.focused());
                dispatch(dialogActions.push('about'));
              }}
            />
          </menu>
        )}
      </menuitem>
    ),
    [appName, devToolsOpen, dispatch, platform, t]
  );
};
