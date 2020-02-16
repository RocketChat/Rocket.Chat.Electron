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

	const canUndo = useSelector(({ editFlags: { canUndo } }) => canUndo);
	const canRedo = useSelector(({ editFlags: { canRedo } }) => canRedo);
	const canCut = useSelector(({ editFlags: { canCut } }) => canCut);
	const canCopy = useSelector(({ editFlags: { canCopy } }) => canCopy);
	const canPaste = useSelector(({ editFlags: { canPaste } }) => canPaste);
	const canSelectAll = useSelector(({ editFlags: { canSelectAll } }) => canSelectAll);

	return <MenuItem ref={ref} label={t('menus.editMenu')}>
		<Menu>
			<MenuItem
				label={t('menus.undo')}
				accelerator='CommandOrControl+Z'
				enabled={!!focusedWebContents && canUndo}
				onClick={() => focusedWebContents.undo()}
			/>
			<MenuItem
				label={t('menus.redo')}
				accelerator={process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z'}
				enabled={!!focusedWebContents && canRedo}
				onClick={() => focusedWebContents.redo()}
			/>
			<MenuItem type='separator' />
			<MenuItem
				label={t('menus.cut')}
				accelerator='CommandOrControl+X'
				enabled={!!focusedWebContents && canCut}
				onClick={() => focusedWebContents.cut()}
			/>
			<MenuItem
				label={t('menus.copy')}
				accelerator='CommandOrControl+C'
				enabled={!!focusedWebContents && canCopy}
				onClick={() => focusedWebContents.copy()}
			/>
			<MenuItem
				label={t('menus.paste')}
				accelerator='CommandOrControl+V'
				enabled={!!focusedWebContents && canPaste}
				onClick={() => focusedWebContents.paste()}
			/>
			<MenuItem
				label={t('menus.selectAll')}
				accelerator='CommandOrControl+A'
				enabled={!!focusedWebContents && canSelectAll}
				onClick={() => focusedWebContents.selectAll()}
			/>
		</Menu>
	</MenuItem>;
});
