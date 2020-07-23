import { readConfigurationFile } from '../fileSystemStorage';

const loadAppServers = async (serversMap) => {
	const appConfiguration = await readConfigurationFile('servers.json', { appData: true });

	if (!appConfiguration) {
		return;
	}

	try {
		for (const [title, url] of Object.entries(appConfiguration)) {
			serversMap.set(url, { url, title });
		}
	} catch (error) {
		console.warn(error);
	}
};

const loadUserServers = async (serversMap) => {
	const userConfiguration = await readConfigurationFile('servers.json', { appData: false, purgeAfter: true });

	if (!userConfiguration) {
		return;
	}

	try {
		for (const [title, url] of Object.entries(userConfiguration)) {
			serversMap.set(url, { url, title });
		}
	} catch (error) {
		console.warn(error);
	}
};

export const migrateServers = async (persistedValues, localStorage) => {
	const serversMap = new Map(
		persistedValues.servers
			.filter(Boolean)
			.filter(({ url, title }) => typeof url === 'string' && typeof title === 'string')
			.map((server) => [server.url, server]),
	);

	if (localStorage['rocket.chat.hosts']) {
		try {
			const storedString = JSON.parse(localStorage['rocket.chat.hosts']);

			if (/^https?:\/\//.test(storedString)) {
				serversMap.set(storedString, { url: storedString, title: storedString });
			} else {
				const storedValue = JSON.parse(storedString);

				if (Array.isArray(storedValue)) {
					storedValue.map((url) => url.replace(/\/$/, '')).forEach((url) => {
						serversMap.set(url, { url, title: url });
					});
				}
			}
		} catch (error) {
			console.warn(error);
		}
	}

	if (serversMap.size === 0) {
		await loadAppServers(serversMap);
		await loadUserServers(serversMap);
	}

	if (localStorage['rocket.chat.currentHost'] && localStorage['rocket.chat.currentHost'] !== 'null') {
		persistedValues.currentServerUrl = localStorage['rocket.chat.currentHost'];
	}

	persistedValues.servers = Array.from(serversMap.values());
	persistedValues.currentServerUrl = serversMap.get(persistedValues.currentServerUrl)?.url ?? null;

	if (localStorage['rocket.chat.sortOrder']) {
		try {
			const sorting = JSON.parse(localStorage['rocket.chat.sortOrder']);
			if (Array.isArray(sorting)) {
				persistedValues.servers = [...serversMap.entries()]
					.sort(([a], [b]) => sorting.indexOf(a) - sorting.indexOf(b));
			}
		} catch (error) {
			console.warn(error);
		}
	}
};
