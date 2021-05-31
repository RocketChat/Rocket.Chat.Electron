/** @jsx jsx */

import { app, MenuItemConstructorOptions } from 'electron';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import * as dialogActions from '../../../common/actions/dialogActions';
import * as rootWindowActions from '../../../common/actions/rootWindowActions';
import * as viewActions from '../../../common/actions/viewActions';
import { jsx } from '../../../common/helpers/jsx/menu';
import { useAppDispatch } from '../../../common/hooks/useAppDispatch';
import { useAppSelector } from '../../../common/hooks/useAppSelector';
import { relaunchApp } from '../../relaunchApp';

export const useAppMenu = (): MenuItemConstructorOptions => {
  const appName = useAppSelector((state) => state.app.name);
  const platform = useAppSelector((state) => state.app.platform);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  return useMemo<MenuItemConstructorOptions>(
    () => (
      <menuitem
        id='appMenu'
        label={platform === 'darwin' ? app.name : t('menus.fileMenu')}
      >
        {platform === 'darwin' && (
          <menu>
            <menuitem
              id='about'
              label={t('menus.about', { appName })}
              click={() => {
                dispatch(rootWindowActions.focused());
                dispatch(dialogActions.push('about'));
              }}
            />
            <separator />
            <menuitem
              id='services'
              label={t('menus.services')}
              role='services'
            />
            <separator />
            <menuitem
              id='hide'
              label={t('menus.hide', { appName })}
              role='hide'
            />
            <menuitem
              id='hideOthers'
              label={t('menus.hideOthers')}
              role='hideOthers'
            />
            <menuitem id='unhide' label={t('menus.unhide')} role='unhide' />
            <separator />
          </menu>
        )}
        {platform !== 'darwin' && (
          <menu>
            <menuitem
              id='addNewServer'
              label={t('menus.addNewServer')}
              accelerator='CommandOrControl+N'
              click={() => {
                dispatch(rootWindowActions.focused());
                dispatch(viewActions.changed('add-new-server'));
              }}
            />
            <separator />
          </menu>
        )}
        <menuitem
          id='disableGpu'
          label={t('menus.disableGpu')}
          enabled={!app.commandLine.hasSwitch('disable-gpu')}
          click={() => {
            relaunchApp('--disable-gpu');
          }}
        />
        <separator />
        <menuitem
          id='quit'
          label={t('menus.quit', { appName })}
          accelerator='CommandOrControl+Q'
          click={() => {
            app.quit();
          }}
        />
      </menuitem>
    ),
    [appName, dispatch, platform, t]
  );
};
