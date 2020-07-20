import { put, select, call } from 'redux-saga/effects';

import { PREFERENCES_READY } from '../actions';
import { readFromStorage } from '../localStorage';

function *loadIsMenuBarEnabled() {
	const autohideMenu = localStorage.getItem('autohideMenu');
	if (autohideMenu) {
		localStorage.removeItem('autohideMenu');
		return autohideMenu !== 'true';
	}

	const isMenuBarEnabled = yield select(({ isMenuBarEnabled }) => isMenuBarEnabled);

	return readFromStorage('isMenuBarEnabled', isMenuBarEnabled);
}

function *loadIsShowWindowOnUnreadChangedEnabled() {
	const showWindowOnUnreadChanged = localStorage.getItem('showWindowOnUnreadChanged');
	if (showWindowOnUnreadChanged) {
		localStorage.removeItem('showWindowOnUnreadChanged');
		return showWindowOnUnreadChanged === 'true';
	}

	const isShowWindowOnUnreadChangedEnabled = yield select(
		({ isShowWindowOnUnreadChangedEnabled }) => isShowWindowOnUnreadChangedEnabled);

	return readFromStorage('isShowWindowOnUnreadChangedEnabled', isShowWindowOnUnreadChangedEnabled);
}

function *loadIsSideBarEnabled() {
	const sidebarClosed = localStorage.getItem('sidebar-closed');
	if (sidebarClosed) {
		localStorage.removeItem('sidebar-closed');
		return sidebarClosed !== 'true';
	}

	const isSideBarEnabled = yield select(({ isSideBarEnabled }) => isSideBarEnabled);

	return readFromStorage('isSideBarEnabled', isSideBarEnabled);
}

function *loadIsTrayIconEnabled() {
	const hideTray = localStorage.getItem('hideTray');
	if (hideTray) {
		localStorage.removeItem('hideTray');
		return hideTray !== 'true';
	}

	const isTrayIconEnabled = yield select(({ isTrayIconEnabled }) => isTrayIconEnabled);

	return readFromStorage('isTrayIconEnabled', isTrayIconEnabled);
}

export function *preferencesSaga() {
	const isMenuBarEnabled = yield call(loadIsMenuBarEnabled);
	const isShowWindowOnUnreadChangedEnabled = yield call(loadIsShowWindowOnUnreadChangedEnabled);
	const isSideBarEnabled = yield call(loadIsSideBarEnabled);
	const isTrayIconEnabled = yield call(loadIsTrayIconEnabled);

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
