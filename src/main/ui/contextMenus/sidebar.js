import { Menu } from 'electron';
import { t } from 'i18next';
import { channel } from 'redux-saga';
import { takeEvery, call, put } from 'redux-saga/effects';

import {
	SIDE_BAR_CONTEXT_MENU_POPPED_UP,
	SIDE_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED,
	SIDE_BAR_RELOAD_SERVER_CLICKED,
	SIDE_BAR_REMOVE_SERVER_CLICKED,
} from '../../../actions';

export function *watchSideBarContextMenuEvents(rootWindow) {
	const contextMenuChannel = yield call(channel);

	yield takeEvery(SIDE_BAR_CONTEXT_MENU_POPPED_UP, function *({ payload: url }) {
		const menuTemplate = [
			{
				label: t('sidebar.item.reload'),
				click: () => {
					contextMenuChannel.put(function *() {
						yield put({ type: SIDE_BAR_RELOAD_SERVER_CLICKED, payload: url });
					});
				},
			},
			{
				label: t('sidebar.item.remove'),
				click: () => {
					contextMenuChannel.put(function *() {
						yield put({ type: SIDE_BAR_REMOVE_SERVER_CLICKED, payload: url });
					});
				},
			},
			{ type: 'separator' },
			{
				label: t('sidebar.item.openDevTools'),
				click: () => {
					contextMenuChannel.put(function *() {
						yield put({ type: SIDE_BAR_OPEN_DEVTOOLS_FOR_SERVER_CLICKED, payload: url });
					});
				},
			},
		];
		const menu = Menu.buildFromTemplate(menuTemplate);
		menu.popup(rootWindow);
	});

	yield takeEvery(contextMenuChannel, function *(saga) {
		yield *saga();
	});
}
