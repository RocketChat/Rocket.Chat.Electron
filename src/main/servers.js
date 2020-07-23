import url from 'url';

import fetch from 'electron-main-fetch';

export const ValidationResult = {
	OK: Symbol('OK'),
	TIMEOUT: Symbol('TIMEOUT'),
	INVALID: Symbol('INVALID'),
};

export const validateServerUrl = async (serverUrl, timeout = 5000) => {
	const {
		username,
		password,
		href,
	} = url.parse(serverUrl);
	let headers = {};

	if (username && password) {
		headers = {
			Authorization: `Basic ${ btoa(`${ username }:${ password }`) }`,
		};
	}

	try {
		const [response] = await Promise.race([
			fetch(`${ href.replace(/\/$/, '') }/api/info`, { headers }),
			new Promise((resolve) => setTimeout(resolve, timeout)),
		]);

		if (!response) {
			return ValidationResult.TIMEOUT;
		}

		if (!response.ok) {
			return ValidationResult.INVALID;
		}

		if (!(await response.json()).success) {
			return ValidationResult.INVALID;
		}

		return ValidationResult.OK;
	} catch (error) {
		console.error(error);
		return ValidationResult.INVALID;
	}
};

export const normalizeServerUrl = (hostUrl) => {
	if (typeof hostUrl !== 'string') {
		return;
	}

	let parsedUrl = url.parse(hostUrl);

	if (!parsedUrl.hostname && parsedUrl.pathname) {
		parsedUrl = url.parse(`https://${ parsedUrl.pathname }`);
	}

	const { protocol, auth, hostname, port, pathname } = parsedUrl;

	if (!protocol || !hostname) {
		return;
	}

	return url.format({ protocol, auth, hostname, port, pathname });
};

export const getServerInfo = async (/* serverUrl */) => {
	throw Error('not implemented');
};
