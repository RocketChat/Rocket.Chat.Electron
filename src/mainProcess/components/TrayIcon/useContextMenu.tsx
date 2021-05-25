/** @jsx jsx */

import { app, MenuItemConstructorOptions } from 'electron';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import * as rootWindowActions from '../../../common/actions/rootWindowActions';
import { jsx } from '../../../common/helpers/jsx/menu';
import { useAppDispatch } from '../../../common/hooks/useAppDispatch';
import { useAppSelector } from '../../../common/hooks/useAppSelector';

export const useContextMenu = (): MenuItemConstructorOptions[] => {
  const rootWindowVisible = useAppSelector(
    (state) => state.ui.rootWindow.state.visible
  );
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  return useMemo<MenuItemConstructorOptions[]>(
    () => (
      <menu>
        <menuitem
          label={rootWindowVisible ? t('tray.menu.hide') : t('tray.menu.show')}
          click={() => {
            dispatch(rootWindowActions.toggled());
          }}
        />
        <menuitem
          label={t('tray.menu.quit')}
          click={() => {
            app.quit();
          }}
        />
      </menu>
    ),
    [dispatch, rootWindowVisible, t]
  );
};
