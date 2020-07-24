import { TouchBar, nativeImage, app } from 'electron';
import { t } from 'i18next';
import { channel } from 'redux-saga';
import { select, takeEvery, getContext, put, call } from 'redux-saga/effects';

import {
	TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
	TOUCH_BAR_SELECT_SERVER_TOUCHED,
} from '../../actions';
import { getPlatform } from '../app';
import {
	selectCurrentServer,
	selectIsMessageBoxFocused,
	selectServers,
} from '../selectors';
import { watchValue } from '../sagas/utils';

const ids = ['bold', 'italic', 'strike', 'inline_code', 'multi_line'];

const eventsChannel = channel();

const createTouchBar = (rootWindow) => {
	const serverSelectionScrubber = new TouchBar.TouchBarScrubber({
		selectedStyle: 'background',
		mode: 'free',
		continuous: false,
		items: [],
		select: (index) => {
			eventsChannel.put(function *() {
				const url = yield select(({ servers }) => servers[index].url);
				yield put({ type: TOUCH_BAR_SELECT_SERVER_TOUCHED, payload: url });
			});
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
			eventsChannel.put(function *() {
				yield put({ type: TOUCH_BAR_FORMAT_BUTTON_TOUCHED, payload: ids[selectedIndex] });
			});
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

	rootWindow.setTouchBar(touchBar);

	return [
		touchBar,
		serverSelectionPopover,
		serverSelectionScrubber,
		messageBoxFormattingButtons,
	];
};

const updateServerSelectionPopover = (serverSelectionPopover, currentServer) => {
	serverSelectionPopover.label = currentServer?.title ?? t('touchBar.selectServer');
	serverSelectionPopover.icon = currentServer?.favicon
		? nativeImage.createFromDataURL(currentServer?.favicon)
		: null;
};

const updateServerSelectionScrubber = (serverSelectionScrubber, servers) => {
	serverSelectionScrubber.items = servers.map((server) => ({
		label: server.title.padEnd(30),
		icon: server.favicon
			? nativeImage.createFromDataURL(server.favicon)
			: null,
	}));
};

const toggleMessageFormattingButtons = (messageBoxFormattingButtons, isEnabled) => {
	messageBoxFormattingButtons.segments.forEach((segment) => {
		segment.enabled = isEnabled;
	});
};

const setRootWindowTouchBar = (rootWindow, touchBar) => {
	rootWindow.setTouchBar(touchBar);
};

function *watchUpdates(
	touchBar,
	serverSelectionPopover,
	serverSelectionScrubber,
	messageBoxFormattingButtons,
) {
	yield watchValue(selectCurrentServer, function *([currentServer]) {
		yield call(updateServerSelectionPopover, serverSelectionPopover, currentServer);
		yield call(setRootWindowTouchBar, yield getContext('rootWindow'), touchBar);
	});

	yield watchValue(selectServers, function *([servers]) {
		yield call(updateServerSelectionScrubber, serverSelectionScrubber, servers);
		yield call(setRootWindowTouchBar, yield getContext('rootWindow'), touchBar);
	});

	yield watchValue(selectIsMessageBoxFocused, function *([isMessageBoxFocused]) {
		yield call(toggleMessageFormattingButtons, messageBoxFormattingButtons, isMessageBoxFocused);
		yield call(setRootWindowTouchBar, yield getContext('rootWindow'), touchBar);
	});
}

function *watchEvents() {
	yield takeEvery(eventsChannel, function *(saga) {
		yield *saga();
	});
}

export function *setupTouchBar() {
	const platform = yield call(getPlatform);
	if (platform !== 'darwin') {
		return;
	}

	const [
		touchBar,
		serverSelectionPopover,
		serverSelectionScrubber,
		messageBoxFormattingButtons,
	] = yield call(createTouchBar, yield getContext('rootWindow'));

	yield *watchUpdates(
		touchBar,
		serverSelectionPopover,
		serverSelectionScrubber,
		messageBoxFormattingButtons,
	);
	yield *watchEvents();
}
