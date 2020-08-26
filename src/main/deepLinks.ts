import { URL } from 'url';

import { app, BrowserWindow } from 'electron';
import { Store } from 'redux';

import {
	DEEP_LINKS_SERVER_FOCUSED,
	DEEP_LINKS_SERVER_ADDED,
} from '../actions';
import { selectServers } from '../selectors';
import { normalizeServerUrl, getServerInfo } from './servers';
import { askForServerAddition, warnAboutInvalidServerUrl } from './ui/dialogs';

const isRocketChatUrl = (parsedUrl: URL): boolean =>
	parsedUrl.protocol === 'rocketchat:';

const isGoRocketChatUrl = (parsedUrl: URL): boolean =>
	parsedUrl.protocol === 'https:' && parsedUrl.hostname === 'go.rocket.chat';

const parseDeepLink = (deepLink: string): { action: string, args: URLSearchParams } => {
	const parsedUrl = new URL(deepLink);

	if (isRocketChatUrl(parsedUrl)) {
		const action = parsedUrl.hostname;
		const args = parsedUrl.searchParams;
		return { action, args };
	}

	if (isGoRocketChatUrl(parsedUrl)) {
		const action = parsedUrl.pathname;
		const args = parsedUrl.searchParams;
		return { action, args };
	}

	return null;
};

const authenticateFromDeepLink = (_token: string, _userId: string): Promise<void> => {
	throw Error('not implemented');
};

const requestOpenRoom = (_rid: string, _path: string): Promise<void> => {
	throw Error('not implemented');
};

export let processDeepLinksInArgs = async (): Promise<void> => undefined;

type AuthenticationParams = {
	host: string;
	token: string;
	userId: string;
};

type OpenRoomParams = {
	host: string;
	rid: string;
	path: string;
}

export const setupDeepLinks = (reduxStore: Store, rootWindow: BrowserWindow): void => {
	const performAuthentication = async ({ host, token, userId }: AuthenticationParams): Promise<void> => {
		const serverUrl = normalizeServerUrl(host);
		if (!serverUrl) {
			return;
		}

		const servers = selectServers(reduxStore.getState());
		const isServerAdded = servers.some((server) => server.url === serverUrl);

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

	const performOpenRoom = async ({ host, rid, path }: OpenRoomParams): Promise<void> => {
		const serverUrl = normalizeServerUrl(host);
		if (!serverUrl) {
			return;
		}

		const servers = selectServers(reduxStore.getState());
		const isServerAdded = servers.some((server) => server.url === serverUrl);

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

	const processDeepLink = async (deepLink: string): Promise<void> => {
		rootWindow.show();

		const parsedDeepLink = parseDeepLink(deepLink);

		if (!parsedDeepLink) {
			return;
		}

		const { action, args } = parsedDeepLink;

		switch (action) {
			case 'auth': {
				const host = args.get('host');
				const token = args.get('token');
				const userId = args.get('userId');
				await performAuthentication({ host, token, userId });
				break;
			}

			case 'room': {
				const host = args.get('host');
				const path = args.get('path');
				const rid = args.get('rid');
				await performOpenRoom({ host, path, rid });
				break;
			}
		}
	};

	app.addListener('open-url', async (event, url): Promise<void> => {
		event.preventDefault();

		await processDeepLink(url);
	});

	app.addListener('second-instance', async (event, argv): Promise<void> => {
		event.preventDefault();

		const args = argv.slice(app.isPackaged ? 1 : 2);

		for (const arg of args) {
			// eslint-disable-next-line no-await-in-loop
			await processDeepLink(arg);
		}
	});

	processDeepLinksInArgs = async (): Promise<void> => {
		const args = process.argv.slice(app.isPackaged ? 1 : 2);

		for (const arg of args) {
			// eslint-disable-next-line no-await-in-loop
			await processDeepLink(arg);
		}
	};
};
