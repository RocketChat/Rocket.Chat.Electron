import { call, put, select, takeEvery } from 'redux-saga/effects';

import { PREFERENCES_READY } from '../actions';
import { readBoolean, writeBoolean } from '../localStorage';


const loadPreferences = () => {
	const isMenuBarEnabled = !readBoolean('autohideMenu', !readBoolean('isMenuBarEnabled', true));
	const isShowWindowOnUnreadChangedEnabled = readBoolean('showWindowOnUnreadChanged',
		readBoolean('isShowWindowOnUnreadChangedEnabled', false));
	const isSideBarEnabled = !readBoolean('sidebar-closed', !readBoolean('isSideBarEnabled', true));
	const isTrayIconEnabled = !readBoolean('hideTray', !readBoolean('isTrayIconEnabled', process.platform !== 'linux'));

	return {
		isMenuBarEnabled,
		isShowWindowOnUnreadChangedEnabled,
		isSideBarEnabled,
		isTrayIconEnabled,
	};
};

export function *preferencesSaga() {
	let prevIsMenuBarEnabled = yield select(({ isMenuBarEnabled }) => isMenuBarEnabled);
	yield takeEvery('*', function *() {
		const isMenuBarEnabled = yield select(({ isMenuBarEnabled }) => isMenuBarEnabled);
		if (prevIsMenuBarEnabled !== isMenuBarEnabled) {
			writeBoolean('isMenuBarEnabled', isMenuBarEnabled);
			prevIsMenuBarEnabled = isMenuBarEnabled;
		}
	});

	let prevIsShowWindowOnUnreadChangedEnabled = yield select(({ isShowWindowOnUnreadChangedEnabled }) => isShowWindowOnUnreadChangedEnabled);
	yield takeEvery('*', function *() {
		const isShowWindowOnUnreadChangedEnabled = yield select(({ isShowWindowOnUnreadChangedEnabled }) => isShowWindowOnUnreadChangedEnabled);
		if (prevIsShowWindowOnUnreadChangedEnabled !== isShowWindowOnUnreadChangedEnabled) {
			writeBoolean('isShowWindowOnUnreadChangedEnabled', isShowWindowOnUnreadChangedEnabled);
			prevIsShowWindowOnUnreadChangedEnabled = isShowWindowOnUnreadChangedEnabled;
		}
	});

	let prevIsSideBarEnabled = yield select(({ isSideBarEnabled }) => isSideBarEnabled);
	yield takeEvery('*', function *() {
		const isSideBarEnabled = yield select(({ isSideBarEnabled }) => isSideBarEnabled);
		if (prevIsSideBarEnabled !== isSideBarEnabled) {
			writeBoolean('isSideBarEnabled', isSideBarEnabled);
			prevIsSideBarEnabled = isSideBarEnabled;
		}
	});

	let prevIsTrayIconEnabled = yield select(({ isTrayIconEnabled }) => isTrayIconEnabled);
	yield takeEvery('*', function *() {
		const isTrayIconEnabled = yield select(({ isTrayIconEnabled }) => isTrayIconEnabled);
		if (prevIsTrayIconEnabled !== isTrayIconEnabled) {
			writeBoolean('isTrayIconEnabled', isTrayIconEnabled);
			prevIsTrayIconEnabled = isTrayIconEnabled;
		}
	});

	const {
		isMenuBarEnabled,
		isShowWindowOnUnreadChangedEnabled,
		isSideBarEnabled,
		isTrayIconEnabled,
	} = yield call(loadPreferences);

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
