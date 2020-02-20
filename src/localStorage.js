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

export const readFromStorage = (key, defaultValue, cast = defaultValueCast(defaultValue)) => {
	console.assert(typeof defaultValue !== 'undefined');

	try {
		const storedValue = JSON.parse(localStorage.getItem(key));

		if (storedValue === null) {
			return defaultValue;
		}

		return cast(storedValue);
	} catch (error) {
		console.warn(error);
		return defaultValue;
	}
};

export const writeToStorage = (key, value) => {
	console.assert(typeof value !== 'undefined');

	try {
		if (value === undefined) {
			localStorage.removeItem(key);
			return;
		}

		if (value === null) {
			localStorage.setItem(key, JSON.stringify(null));
			return;
		}

		localStorage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.warn(error);
	}
};
