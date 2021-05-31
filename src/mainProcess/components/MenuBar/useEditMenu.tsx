/** @jsx jsx */

import type { MenuItemConstructorOptions } from 'electron';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { jsx } from '../../../common/helpers/jsx/menu';

export const useEditMenu = (): MenuItemConstructorOptions => {
  const { t } = useTranslation();

  return useMemo<MenuItemConstructorOptions>(
    () => (
      <menuitem id='editMenu' label={t('menus.editMenu')}>
        <menuitem id='undo' label={t('menus.undo')} role='undo' />
        <menuitem id='redo' label={t('menus.redo')} role='redo' />
        <separator />,
        <menuitem id='cut' label={t('menus.cut')} role='cut' />
        <menuitem id='copy' label={t('menus.copy')} role='copy' />
        <menuitem id='paste' label={t('menus.paste')} role='paste' />
        <menuitem
          id='selectAll'
          label={t('menus.selectAll')}
          role='selectAll'
        />
      </menuitem>
    ),
    [t]
  );
};
