import querystring from 'querystring';
import url from 'url';
import { getMainWindow } from './mainWindow';


const normalizeUrl = (hostUrl) => {
	if (!/^https?:\/\//.test(hostUrl)) {
		return `https://${ hostUrl }`;
	}

	return hostUrl;
};

const processAuth = async ({ host, token, userId }) => {
	const mainWindow = await getMainWindow();
	const hostUrl = normalizeUrl(host);
	mainWindow.send('add-host', hostUrl, { token, userId });
};

const processRoom = async ({ host, rid, path }) => {
	const mainWindow = await getMainWindow();
	const hostUrl = normalizeUrl(host);
	mainWindow.send('add-host', hostUrl);
	mainWindow.send('open-room', hostUrl, { rid, path });
};

export const processDeepLink = (link) => {
	const { protocol, hostname:	action, query } = url.parse(link);

	if (protocol !== 'rocketchat:') {
		return;
	}

	switch (action) {
		case 'auth': {
			processAuth(querystring.parse(query));
			break;
		}
		case 'room': {
			processRoom(querystring.parse(query));
			break;
		}
	}
};
