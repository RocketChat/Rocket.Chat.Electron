/** @jsx jsx */

import { Menu } from 'electron';
import i18next from 'i18next';

import * as serverActions from '../common/actions/serverActions';
import { jsx } from '../common/helpers/jsx/menu';
import { dispatch } from '../common/store';
import type { Server } from '../common/types/Server';
import { getRootWindow } from './rootWindow';
import { getWebContentsByServerUrl } from './serverView';

const t = i18next.t.bind(i18next);

export const triggerSideBarPopup = async (
  url: Server['url']
): Promise<void> => {
  const menuTemplate = (
    <menu>
      <menuitem
        label={t('sidebar.item.reload')}
        click={() => {
          const guestWebContents = getWebContentsByServerUrl(url);
          guestWebContents?.loadURL(url);
        }}
      />
      <menuitem
        label={t('sidebar.item.remove')}
        click={() => {
          dispatch(serverActions.removed(url));
        }}
      />
      <separator />
      <menuitem
        label={t('sidebar.item.openDevTools')}
        click={() => {
          const guestWebContents = getWebContentsByServerUrl(url);
          guestWebContents?.openDevTools();
        }}
      />
    </menu>
  );

  const menu = Menu.buildFromTemplate(menuTemplate);
  menu.popup({
    window: await getRootWindow(),
  });
};
