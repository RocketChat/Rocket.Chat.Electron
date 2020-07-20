const defaultValueCast = (defaultValue) => (value) => {
	if (defaultValue === null) {
		return value;
	}

	if (typeof defaultValue === 'boolean') {
		return Boolean(value);
	}

	if (typeof defaultValue === 'number') {
		return Number(value);
	}

	if (typeof defaultValue === 'string') {
		return String(value);
	}

	if (Array.isArray(defaultValue)) {
		return Array.isArray(value) ? value : defaultValue;
	}

	return typeof value === 'object' ? value : defaultValue;
};

export const readFromStorage = async (rootWindow, key, defaultValue, cast = defaultValueCast(defaultValue)) => {
	console.assert(typeof defaultValue !== 'undefined');

	try {
		const code = `localStorage.getItem(${ JSON.stringify(key) })`;
		const storedValue = JSON.parse(await rootWindow.webContents.executeJavaScript(code));

		if (storedValue === null) {
			return defaultValue;
		}

		return cast(storedValue);
	} catch (error) {
		console.warn(error);
		return defaultValue;
	}
};

export const writeToStorage = async (rootWindow, key, value) => {
	console.assert(typeof value !== 'undefined');

	try {
		if (value === undefined) {
			const code = `localStorage.removeItem(${ JSON.stringify(key) })`;
			return rootWindow.webContents.executeJavaScript(code);
		}

		if (value === null) {
			const code = `localStorage.setItem(${ JSON.stringify(key) }, JSON.stringify(null))`;
			return rootWindow.webContents.executeJavaScript(code);
		}

		const code = `localStorage.setItem(${ JSON.stringify(key) }, ${ JSON.stringify(value) })`;
		return rootWindow.webContents.executeJavaScript(code);
	} catch (error) {
		console.warn(error);
	}
};
