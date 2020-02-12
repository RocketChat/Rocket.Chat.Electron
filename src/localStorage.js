const defaultValueCast = (defaultValue) => (value) => {
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
		console.warn(error.stack);
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
		console.warn(error.stack);
	}
};

const readValue = (cast, key, defaultValue) => {
	try {
		const storedValue = JSON.parse(localStorage.getItem(key));

		if (storedValue === null) {
			return defaultValue;
		}

		return cast(storedValue);
	} catch (error) {
		console.warn(error.stack);
		return defaultValue;
	}
};

export const readBoolean = (key, defaultValue) => readValue(Boolean, key, defaultValue);
export const readString = (key, defaultValue) => readValue(String, key, defaultValue);
export const readArrayOf = (cast, key, defaultArray = []) => {
	try {
		const storedValue = JSON.parse(localStorage.getItem(key));

		if (storedValue === null || !Array.isArray(storedValue)) {
			return defaultArray;
		}

		return storedValue.map(cast).filter((value) => value !== undefined);
	} catch (error) {
		console.warn(error.stack);
		return defaultArray;
	}
};
export const readMap = (key, defaultMap = new Map()) => {
	try {
		const storedValue = JSON.parse(localStorage.getItem(key));

		if (storedValue === null || !Array.isArray(storedValue)) {
			return defaultMap;
		}

		const pairs = storedValue
			.filter(([key, value]) => typeof key === 'string' && value !== undefined)
			.map(([key, value]) => [key, value]);

		return new Map(pairs);
	} catch (error) {
		console.warn(error.stack);
		return defaultMap;
	}
};

const writeValue = (cast, key, value) => {
	try {
		if (value === undefined) {
			localStorage.removeItem(key);
			return;
		}

		if (value === null) {
			localStorage.setItem(key, JSON.stringify(null));
			return;
		}

		localStorage.setItem(key, JSON.stringify(cast(value)));
	} catch (error) {
		console.warn(error.stack);
	}
};

export const writeBoolean = (key, value) => writeValue(Boolean, key, value);
export const writeString = (key, value) => writeValue(String, key, value);
export const writeArrayOf = (cast, key, array) => {
	try {
		if (array === undefined) {
			localStorage.removeItem(key);
			return;
		}

		if (!Array.isArray(array)) {
			return;
		}

		localStorage.setItem(key, JSON.stringify(array.filter((value) => value === cast(value))));
	} catch (error) {
		console.warn(error.stack);
	}
};
export const writeMap = (key, map) => {
	try {
		if (map === undefined) {
			localStorage.removeItem(key);
			return;
		}

		if (!(map instanceof Map)) {
			return;
		}

		localStorage.setItem(key, JSON.stringify(Array.from(map.entries())));
	} catch (error) {
		console.warn(error.stack);
	}
};
