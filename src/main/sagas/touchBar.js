import { TouchBar, nativeImage, app } from 'electron';
import { t } from 'i18next';
import { channel } from 'redux-saga';
import { select, takeEvery, getContext, put, call } from 'redux-saga/effects';
import { createSelector, defaultMemoize } from 'reselect';

import {
	TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
	TOUCH_BAR_SELECT_SERVER_TOUCHED,
} from '../../actions';
import { storeChangeChannel } from '../channels';

const isSameServer = (a, b) => a === b || ((a.title === b.title) && (a.url === b.url) && (a.favicon === b.favicon));
const isSameServers = (a, b) => a === b || (a.length === b.length && a.every((x, i) => isSameServer(x, b[i])));

const selectServers = createSelector(
	({ servers }) => servers,
	defaultMemoize((servers) => servers, isSameServers),
);
const selectCurrentServer = ({ servers, currentServerUrl }) => servers.find(({ url }) => url === currentServerUrl);
const selectIsMessageBoxFocused = ({ isMessageBoxFocused }) => isMessageBoxFocused;
const ids = ['bold', 'italic', 'strike', 'inline_code', 'multi_line'];

const serverIndexSelectedChannel = channel();

const formatButtonTouchedChannel = channel();

export function *handleTouchBar() {
	if (process.platform !== 'darwin') {
		return;
	}

	const serverSelectionScrubber = new TouchBar.TouchBarScrubber({
		selectedStyle: 'background',
		mode: 'free',
		continuous: false,
		items: [],
		select: (index) => {
			serverIndexSelectedChannel.put(index);
		},
	});

	const serverSelectionPopover = new TouchBar.TouchBarPopover({
		label: t('touchBar.selectServer'),
		icon: null,
		items: new TouchBar({
			items: [serverSelectionScrubber],
		}),
		showCloseButton: true,
	});

	const messageBoxFormattingButtons = new TouchBar.TouchBarSegmentedControl({
		mode: 'buttons',
		segments: ids.map((id) => ({
			icon: nativeImage.createFromPath(`${ app.getAppPath() }/app/public/images/touch-bar/${ id }.png`),
			enabled: false,
		})),
		change: (selectedIndex) => {
			formatButtonTouchedChannel.put(ids[selectedIndex]);
		},
	});

	const touchBar = new TouchBar({
		items: [
			serverSelectionPopover,
			new TouchBar.TouchBarSpacer({ size: 'flexible' }),
			messageBoxFormattingButtons,
			new TouchBar.TouchBarSpacer({ size: 'flexible' }),
		],
	});

	function *updateTouchBar() {
		const rootWindow = yield getContext('rootWindow');
		rootWindow.setTouchBar(touchBar);
	}

	const store = yield getContext('reduxStore');

	yield takeEvery(storeChangeChannel(store, selectCurrentServer), function *([currentServer]) {
		serverSelectionPopover.label = currentServer?.title ?? t('touchBar.selectServer');
		serverSelectionPopover.icon = currentServer?.favicon
			? nativeImage.createFromDataURL(currentServer?.favicon)
			: null;
		yield call(updateTouchBar);
	});

	yield takeEvery(storeChangeChannel(store, selectServers), function *([servers]) {
		serverSelectionScrubber.items = servers.map((server) => ({
			label: server.title.padEnd(30),
			icon: server.favicon
				? nativeImage.createFromDataURL(server.favicon)
				: null,
		}));
		yield call(updateTouchBar);
	});

	yield takeEvery(storeChangeChannel(store, selectIsMessageBoxFocused), function *([isMessageBoxFocused]) {
		messageBoxFormattingButtons.segments.forEach((segment) => {
			segment.enabled = isMessageBoxFocused;
		});
		yield call(updateTouchBar);
	});

	yield takeEvery(serverIndexSelectedChannel, function *(index) {
		const url = yield select(({ servers }) => servers[index].url);
		yield put({ type: TOUCH_BAR_SELECT_SERVER_TOUCHED, payload: url });
	});

	yield takeEvery(formatButtonTouchedChannel, function *(id) {
		yield put({ type: TOUCH_BAR_FORMAT_BUTTON_TOUCHED, payload: id });
	});
}
