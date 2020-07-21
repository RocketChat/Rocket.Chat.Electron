import { put, select, call } from 'redux-saga/effects';

import { PREFERENCES_READY } from '../../actions';
import {
	selectIsMenuBarEnabled,
	selectIsShowWindowOnUnreadChangedEnabled,
	selectIsSideBarEnabled,
	selectIsTrayIconEnabled,
} from '../selectors';
import { readItem, readFromStorage, removeItem } from '../localStorage';

function *loadIsMenuBarEnabled(rootWindow) {
	const autohideMenu = yield call(readItem, rootWindow, 'autohideMenu');
	if (autohideMenu) {
		removeItem(rootWindow, 'autohideMenu');
		return autohideMenu !== 'true';
	}

	const isMenuBarEnabled = yield select(selectIsMenuBarEnabled);

	return yield call(readFromStorage, rootWindow, 'isMenuBarEnabled', isMenuBarEnabled);
}

function *loadIsShowWindowOnUnreadChangedEnabled(rootWindow) {
	const showWindowOnUnreadChanged = yield call(readItem, rootWindow, 'showWindowOnUnreadChanged');
	if (showWindowOnUnreadChanged) {
		removeItem(rootWindow, 'showWindowOnUnreadChanged');
		return showWindowOnUnreadChanged === 'true';
	}

	const isShowWindowOnUnreadChangedEnabled = yield select(selectIsShowWindowOnUnreadChangedEnabled);

	return yield call(readFromStorage, rootWindow, 'isShowWindowOnUnreadChangedEnabled', isShowWindowOnUnreadChangedEnabled);
}

function *loadIsSideBarEnabled(rootWindow) {
	const sidebarClosed = yield call(readItem, rootWindow, 'sidebar-closed');
	if (sidebarClosed) {
		removeItem(rootWindow, 'sidebar-closed');
		return sidebarClosed !== 'true';
	}

	const isSideBarEnabled = yield select(selectIsSideBarEnabled);

	return yield call(readFromStorage, rootWindow, 'isSideBarEnabled', isSideBarEnabled);
}

function *loadIsTrayIconEnabled(rootWindow) {
	const hideTray = yield call(readItem, rootWindow, 'hideTray');
	if (hideTray) {
		removeItem(rootWindow, 'hideTray');
		return hideTray !== 'true';
	}

	const isTrayIconEnabled = yield select(selectIsTrayIconEnabled);

	return yield call(readFromStorage, rootWindow, 'isTrayIconEnabled', isTrayIconEnabled);
}

export function *preferencesSaga(rootWindow) {
	const isMenuBarEnabled = yield call(loadIsMenuBarEnabled, rootWindow);
	const isShowWindowOnUnreadChangedEnabled = yield call(loadIsShowWindowOnUnreadChangedEnabled, rootWindow);
	const isSideBarEnabled = yield call(loadIsSideBarEnabled, rootWindow);
	const isTrayIconEnabled = yield call(loadIsTrayIconEnabled, rootWindow);

	yield put({
		type: PREFERENCES_READY,
		payload: {
			isMenuBarEnabled,
			isShowWindowOnUnreadChangedEnabled,
			isSideBarEnabled,
			isTrayIconEnabled,
		},
	});
}
