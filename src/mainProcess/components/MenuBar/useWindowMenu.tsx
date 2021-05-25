/** @jsx jsx */

import type { MenuItemConstructorOptions } from 'electron';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import * as rootWindowActions from '../../../common/actions/rootWindowActions';
import * as viewActions from '../../../common/actions/viewActions';
import { jsx } from '../../../common/helpers/jsx/menu';
import { useAppDispatch } from '../../../common/hooks/useAppDispatch';
import { useAppSelector } from '../../../common/hooks/useAppSelector';

export const useWindowMenu = (): MenuItemConstructorOptions => {
  const platform = useAppSelector((state) => state.app.platform);
  const view = useAppSelector((state) => state.ui.view);
  const servers = useAppSelector(
    (state) => state.servers.map(({ url, title }) => ({ url, title })),
    (a, b) => {
      if (a.length !== b.length) {
        return false;
      }

      for (let i = 0, l = a.length; i < l; ++i) {
        if (a[i].url !== b[i].url) {
          return false;
        }

        if (a[i].title !== b[i].title) {
          return false;
        }
      }

      return true;
    }
  );
  const showOnBadgeChange = useAppSelector(
    (state) => state.ui.rootWindow.showOnBadgeChange
  );
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  return useMemo<MenuItemConstructorOptions>(
    () => (
      <menuitem id='windowMenu' label={t('menus.windowMenu')} role='windowMenu'>
        {platform === 'darwin' && (
          <menu>
            <menuitem
              id='addNewServer'
              label={t('menus.addNewServer')}
              accelerator={'CommandOrControl+N'}
              click={async () => {
                dispatch(rootWindowActions.focused());
                dispatch(viewActions.changed('add-new-server'));
              }}
            />
            <separator />
          </menu>
        )}
        {servers.length > 0 && (
          <menu>
            {servers.map((server, i) => (
              <menuitem
                id={server.url}
                type={
                  typeof view === 'object' && view.url === server.url
                    ? 'checkbox'
                    : 'normal'
                }
                label={server.title?.replace(/&/g, '&&')}
                checked={typeof view === 'object' && view.url === server.url}
                accelerator={`CommandOrControl+${i + 1}`}
                click={async () => {
                  dispatch(rootWindowActions.focused());
                  dispatch(viewActions.changed({ url: server.url }));
                }}
              />
            ))}
            <separator />
          </menu>
        )}
        <menuitem
          id='downloads'
          label={t('menus.downloads')}
          checked={view === 'downloads'}
          accelerator={'CommandOrControl+D'}
          click={() => {
            dispatch(viewActions.changed('downloads'));
          }}
        />
        <menuitem
          id='showOnUnreadMessage'
          type='checkbox'
          label={t('menus.showOnUnreadMessage')}
          checked={showOnBadgeChange}
          click={async ({ checked }) => {
            dispatch(rootWindowActions.focused());
            dispatch(rootWindowActions.showOnBadgeChangeToggled(checked));
          }}
        />
        <separator />
        <menuitem
          id='minimize'
          role='minimize'
          label={t('menus.minimize')}
          accelerator={'CommandOrControl+M'}
        />
        <menuitem
          id='close'
          role='close'
          label={t('menus.close')}
          accelerator={'CommandOrControl+W'}
        />
      </menuitem>
    ),
    [dispatch, platform, servers, showOnBadgeChange, t, view]
  );
};
