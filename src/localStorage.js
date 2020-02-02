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

		return storedValue.filter((value) => value === cast(value));
	} catch (error) {
		console.warn(error.stack);
		return defaultArray;
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
		if (!Array.isArray(array)) {
			return;
		}

		if (array === undefined) {
			localStorage.removeItem(key);
			return;
		}

		if (array === null) {
			localStorage.setItem(key, JSON.stringify(null));
			return;
		}

		localStorage.setItem(key, JSON.stringify(array.filter((value) => value === cast(value))));
	} catch (error) {
		console.warn(error.stack);
	}
};
