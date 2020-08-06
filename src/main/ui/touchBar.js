import { TouchBar, nativeImage, app, webContents } from 'electron';
import { t } from 'i18next';

import { TOUCH_BAR_SELECT_SERVER_TOUCHED } from '../../actions';
import { EVENT_FORMAT_BUTTON_TOUCHED } from '../../ipc';
import {
	selectCurrentServer,
	selectIsMessageBoxFocused,
	selectServers,
} from '../../selectors';

const ids = ['bold', 'italic', 'strike', 'inline_code', 'multi_line'];

const createTouchBar = (reduxStore, rootWindow) => {
	const serverSelectionScrubber = new TouchBar.TouchBarScrubber({
		selectedStyle: 'background',
		mode: 'free',
		continuous: false,
		items: [],
		select: (index) => {
			rootWindow.show();
			const url = (({ servers }) => servers[index].url)(reduxStore.getState());
			reduxStore.dispatch({ type: TOUCH_BAR_SELECT_SERVER_TOUCHED, payload: url });
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
			rootWindow.show();
			webContents.getAllWebContents().forEach((webContents) => {
				webContents.send(EVENT_FORMAT_BUTTON_TOUCHED, ids[selectedIndex]);
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

export const setupTouchBar = (reduxStore, rootWindow) => {
	if (process.platform !== 'darwin') {
		return;
	}

	const [
		touchBar,
		serverSelectionPopover,
		serverSelectionScrubber,
		messageBoxFormattingButtons,
	] = createTouchBar(reduxStore, rootWindow);

	let prevCurrentServer;
	reduxStore.subscribe(() => {
		const currentServer = selectCurrentServer(reduxStore.getState());
		if (prevCurrentServer !== currentServer) {
			updateServerSelectionPopover(serverSelectionPopover, currentServer);
			setRootWindowTouchBar(rootWindow, touchBar);
			prevCurrentServer = currentServer;
		}
	});

	let prevServers;
	reduxStore.subscribe(() => {
		const servers = selectServers(reduxStore.getState());
		if (prevServers !== servers) {
			updateServerSelectionScrubber(serverSelectionScrubber, servers);
			setRootWindowTouchBar(rootWindow, touchBar);
			prevServers = servers;
		}
	});

	let prevIsMessageBoxFocused;
	reduxStore.subscribe(() => {
		const isMessageBoxFocused = selectIsMessageBoxFocused(reduxStore.getState());
		if (prevIsMessageBoxFocused !== isMessageBoxFocused) {
			toggleMessageFormattingButtons(messageBoxFormattingButtons, isMessageBoxFocused);
			setRootWindowTouchBar(rootWindow, touchBar);
			prevIsMessageBoxFocused = isMessageBoxFocused;
		}
	});
};
