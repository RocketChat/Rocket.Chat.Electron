import querystring from 'querystring';
import url from 'url';

import { app } from 'electron';

import {
	DEEP_LINKS_SERVER_FOCUSED,
	DEEP_LINKS_SERVER_ADDED,
} from '../actions';
import { askForServerAddition, warnAboutInvalidServerUrl } from './ui/dialogs';
import { normalizeServerUrl, getServerInfo } from './servers';

const isRocketChatUrl = (parsedUrl) =>
	parsedUrl.protocol === 'rocketchat:';

const isGoRocketChatUrl = (parsedUrl) =>
	parsedUrl.protocol === 'https:' && parsedUrl.hostname === 'go.rocket.chat';

const parseDeepLink = (deepLink) => {
	const parsedUrl = url.parse(deepLink);

	if (isRocketChatUrl(parsedUrl)) {
		const action = parsedUrl.hostname;
		const args = querystring.parse(parsedUrl.query);
		return { action, args };
	}

	if (isGoRocketChatUrl(parsedUrl)) {
		const action = parsedUrl.pathname;
		const args = querystring.parse(parsedUrl.query);
		return { action, args };
	}

	return null;
};

const authenticateFromDeepLink = (/* token, userId */) => {
	throw Error('not implemented');
};

const requestOpenRoom = (/* rid, path */) => {
	throw Error('not implemented');
};

export let processDeepLinksInArgs = async () => undefined;

export const setupDeepLinks = (reduxStore, rootWindow) => {
	const performAuthentication = async ({ host, token, userId }) => {
		const serverUrl = normalizeServerUrl(host);
		if (!serverUrl) {
			return;
		}

		const isServerAdded = (({ servers }) => servers.some((server) => server.url === serverUrl))(reduxStore.getState());

		if (isServerAdded) {
			reduxStore.dispatch({ type: DEEP_LINKS_SERVER_FOCUSED, payload: serverUrl });
			await authenticateFromDeepLink(token, userId);
			return;
		}

		const permitted = await askForServerAddition(rootWindow, serverUrl);

		if (!permitted) {
			return;
		}

		const { server, error } = await getServerInfo(serverUrl);

		if (error) {
			await warnAboutInvalidServerUrl(rootWindow, serverUrl, error);
		}

		reduxStore.dispatch({ type: DEEP_LINKS_SERVER_ADDED, payload: server });
		reduxStore.dispatch({ type: DEEP_LINKS_SERVER_FOCUSED, payload: serverUrl });
		await authenticateFromDeepLink(token, userId);
	};

	const performOpenRoom = async ({ host, rid, path }) => {
		const serverUrl = normalizeServerUrl(host);
		if (!serverUrl) {
			return;
		}

		const isServerAdded = (({ servers }) => servers.some((server) => server.url === serverUrl))(reduxStore.getState());

		if (isServerAdded) {
			reduxStore.dispatch({ type: DEEP_LINKS_SERVER_FOCUSED, payload: serverUrl });
			await requestOpenRoom(rid, path);
			return;
		}

		const permitted = await askForServerAddition(rootWindow, serverUrl);

		if (!permitted) {
			return;
		}

		const { server, error } = await getServerInfo(serverUrl);

		if (error) {
			await warnAboutInvalidServerUrl(rootWindow, serverUrl, error);
		}

		reduxStore.dispatch({ type: DEEP_LINKS_SERVER_ADDED, payload: server });
		reduxStore.dispatch({ type: DEEP_LINKS_SERVER_FOCUSED, payload: serverUrl });
		await requestOpenRoom(rid, path);
	};

	const processDeepLink = async (deepLink) => {
		rootWindow.show();

		const parsedDeepLink = parseDeepLink(deepLink);

		if (!parsedDeepLink) {
			return;
		}

		const { action, args } = parsedDeepLink;

		switch (action) {
			case 'auth': {
				await performAuthentication(args);
				break;
			}

			case 'room': {
				await performOpenRoom(args);
				break;
			}
		}
	};

	app.addListener('open-url', async (event, url) => {
		event.preventDefault();

		await processDeepLink(url);
	});

	app.addListener('second-instance', async (event, argv) => {
		event.preventDefault();

		const args = argv.slice(app.isPackaged ? 1 : 2);

		for (const arg of args) {
			// eslint-disable-next-line no-await-in-loop
			await processDeepLink(arg);
		}
	});

	processDeepLinksInArgs = async () => {
		const args = process.argv.slice(app.isPackaged ? 1 : 2);

		for (const arg of args) {
			// eslint-disable-next-line no-await-in-loop
			await processDeepLink(arg);
		}
	};
};
