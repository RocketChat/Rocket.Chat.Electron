import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';

import { MenuItem } from '../electron/MenuItem';
import { Menu } from '../electron/Menu';

export const EditMenu = forwardRef(function EditMenu(_, ref) {
	const { t } = useTranslation();

	return <MenuItem ref={ref} label={t('menus.editMenu')}>
		<Menu>
			<MenuItem
				label={t('menus.undo')}
				accelerator='CommandOrControl+Z'
				role='undo'
			/>
			<MenuItem
				label={t('menus.redo')}
				accelerator={process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z'}
				role='redo'
			/>
			<MenuItem type='separator' />
			<MenuItem
				label={t('menus.cut')}
				accelerator='CommandOrControl+X'
				role='cut'
			/>
			<MenuItem
				label={t('menus.copy')}
				accelerator='CommandOrControl+C'
				role='copy'
			/>
			<MenuItem
				label={t('menus.paste')}
				accelerator='CommandOrControl+V'
				role='paste'
			/>
			<MenuItem
				label={t('menus.selectAll')}
				accelerator='CommandOrControl+A'
				role='selectAll'
			/>
		</Menu>
	</MenuItem>;
});
