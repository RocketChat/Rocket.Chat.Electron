import { TouchBar, nativeImage, app } from 'electron';
import { t } from 'i18next';
import { select, takeEvery, getContext } from 'redux-saga/effects';
import { createSelector, defaultMemoize } from 'reselect';

import {
	TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
	TOUCH_BAR_SELECT_SERVER_TOUCHED,
} from '../../../actions';
import { storeValueChannel } from '../../channels';

const isSameServer = (a, b) => a === b || ((a.title === b.title) && (a.url === b.url) && (a.favicon === b.favicon));
const isSameServers = (a, b) => a === b || (a.length === b.length && a.every((x, i) => isSameServer(x, b[i])));

const selectServers = createSelector(
	({ servers }) => servers,
	defaultMemoize((servers) => servers, isSameServers),
);
const selectCurrentServer = ({ servers, currentServerUrl }) => servers.find(({ url }) => url === currentServerUrl);
const selectIsMessageBoxFocused = ({ isMessageBoxFocused }) => isMessageBoxFocused;
const ids = ['bold', 'italic', 'strike', 'inline_code', 'multi_line'];

export function *touchBarSaga(rootWindow) {
	if (process.platform !== 'darwin') {
		return;
	}

	const currentServer = yield select(selectCurrentServer);
	const servers = yield select(selectServers);

	const store = yield getContext('store');

	const serverSelectionScrubber = new TouchBar.TouchBarScrubber({
		selectedStyle: 'background',
		mode: 'free',
		continuous: false,
		items: servers.map((server) => ({
			label: server.title.padEnd(30),
			icon: server.favicon
				? nativeImage.createFromDataURL(server.favicon)
				: null,
		})),
		select: (index) => {
			const url = (({ servers }) => servers[index].url)(store.getState());
			store.dispatch({ type: TOUCH_BAR_SELECT_SERVER_TOUCHED, payload: url });
		},
	});

	const serverSelectionPopover = new TouchBar.TouchBarPopover({
		label: currentServer?.title ?? t('touchBar.selectServer'),
		icon: currentServer?.favicon ? nativeImage.createFromDataURL(currentServer?.favicon) : null,
		items: new TouchBar({
			items: [
				serverSelectionScrubber,
			],
		}),
		showCloseButton: true,
	});

	const isMessageBoxFocused = yield select(selectIsMessageBoxFocused);

	const messageBoxFormattingButtons = new TouchBar.TouchBarSegmentedControl({
		mode: 'buttons',
		segments: ids.map((id) => ({
			icon: nativeImage.createFromPath(`${ app.getAppPath() }/app/public/images/touch-bar/${ id }.png`),
			enabled: isMessageBoxFocused,
		})),
		change: (selectedIndex) => {
			store.dispatch({ type: TOUCH_BAR_FORMAT_BUTTON_TOUCHED, payload: ids[selectedIndex] });
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

	yield takeEvery(storeValueChannel(store, selectCurrentServer), function *(currentServer) {
		serverSelectionPopover.label = currentServer?.title ?? t('touchBar.selectServer');
		serverSelectionPopover.icon = currentServer?.favicon
			? nativeImage.createFromDataURL(currentServer?.favicon)
			: null;
		rootWindow.setTouchBar(touchBar);
	});

	yield takeEvery(storeValueChannel(store, selectServers), function *(servers) {
		serverSelectionScrubber.items = servers.map((server) => ({
			label: server.title.padEnd(30),
			icon: server.favicon
				? nativeImage.createFromDataURL(server.favicon)
				: null,
		}));
		rootWindow.setTouchBar(touchBar);
	});

	yield takeEvery(storeValueChannel(store, selectIsMessageBoxFocused), function *(isMessageBoxFocused) {
		messageBoxFormattingButtons.segments.forEach((segment) => {
			segment.enabled = isMessageBoxFocused;
		});
		rootWindow.setTouchBar(touchBar);
	});
}
