import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { remote } from 'electron';

import { MenuItem } from '../electron/MenuItem';
import { Menu } from '../electron/Menu';

export const EditMenu = forwardRef(function EditMenu(_, ref) {
	const { t } = useTranslation();

	const focusedWebContents = useSelector(({ focusedWebContentsId }) =>
		(focusedWebContentsId > -1 ? remote.webContents.fromId(focusedWebContentsId) : null));

	return <MenuItem ref={ref} label={t('menus.editMenu')}>
		<Menu>
			<MenuItem
				label={t('menus.undo')}
				accelerator='CommandOrControl+Z'
				enabled={!!focusedWebContents}
				onClick={() => focusedWebContents.undo()}
			/>
			<MenuItem
				label={t('menus.redo')}
				accelerator={process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z'}
				enabled={!!focusedWebContents}
				onClick={() => focusedWebContents.redo()}
			/>
			<MenuItem type='separator' />
			<MenuItem
				label={t('menus.cut')}
				accelerator='CommandOrControl+X'
				enabled={!!focusedWebContents}
				onClick={() => focusedWebContents.cut()}
			/>
			<MenuItem
				label={t('menus.copy')}
				accelerator='CommandOrControl+C'
				enabled={!!focusedWebContents}
				onClick={() => focusedWebContents.copy()}
			/>
			<MenuItem
				label={t('menus.paste')}
				accelerator='CommandOrControl+V'
				enabled={!!focusedWebContents}
				onClick={() => focusedWebContents.paste()}
			/>
			<MenuItem
				label={t('menus.selectAll')}
				accelerator='CommandOrControl+A'
				enabled={!!focusedWebContents}
				onClick={() => focusedWebContents.selectAll()}
			/>
		</Menu>
	</MenuItem>;
});
