import { TouchBar, nativeImage, app, BrowserWindow, TouchBarScrubber, TouchBarPopover, TouchBarSegmentedControl } from 'electron';
import i18next from 'i18next';
import { Store } from 'redux';

import {
	TOUCH_BAR_SELECT_SERVER_TOUCHED,
	TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
} from '../../actions';
import {
	selectCurrentServer,
	selectIsMessageBoxFocused,
	selectServers,
} from '../../selectors';
import { Server } from '../../structs/servers';

const t = i18next.t.bind(i18next);

const ids = ['bold', 'italic', 'strike', 'inline_code', 'multi_line'];

const createTouchBar = (reduxStore: Store, rootWindow: BrowserWindow): [
	TouchBar,
	TouchBarPopover,
	TouchBarScrubber,
	TouchBarSegmentedControl,
] => {
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
			reduxStore.dispatch({ type: TOUCH_BAR_FORMAT_BUTTON_TOUCHED, payload: ids[selectedIndex] });
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

const updateServerSelectionPopover = (serverSelectionPopover: TouchBarPopover, currentServer: Server): void => {
	serverSelectionPopover.label = currentServer?.title ?? t('touchBar.selectServer');
	serverSelectionPopover.icon = currentServer?.favicon
		? nativeImage.createFromDataURL(currentServer?.favicon)
		: null;
};

const updateServerSelectionScrubber = (serverSelectionScrubber: TouchBarScrubber, servers: Server[]): void => {
	serverSelectionScrubber.items = servers.map((server) => ({
		label: server.title.padEnd(30),
		icon: server.favicon
			? nativeImage.createFromDataURL(server.favicon)
			: null,
	}));
};

const toggleMessageFormattingButtons = (messageBoxFormattingButtons: TouchBarSegmentedControl, isEnabled: boolean): void => {
	messageBoxFormattingButtons.segments.forEach((segment) => {
		segment.enabled = isEnabled;
	});
};

export const setupTouchBar = (reduxStore: Store, rootWindow: BrowserWindow): void => {
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
			rootWindow.setTouchBar(touchBar);
			prevCurrentServer = currentServer;
		}
	});

	let prevServers;
	reduxStore.subscribe(() => {
		const servers = selectServers(reduxStore.getState());
		if (prevServers !== servers) {
			updateServerSelectionScrubber(serverSelectionScrubber, servers);
			rootWindow.setTouchBar(touchBar);
			prevServers = servers;
		}
	});

	let prevIsMessageBoxFocused;
	reduxStore.subscribe(() => {
		const isMessageBoxFocused = selectIsMessageBoxFocused(reduxStore.getState());
		if (prevIsMessageBoxFocused !== isMessageBoxFocused) {
			toggleMessageFormattingButtons(messageBoxFormattingButtons, isMessageBoxFocused);
			rootWindow.setTouchBar(touchBar);
			prevIsMessageBoxFocused = isMessageBoxFocused;
		}
	});
};
