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

const writeValue = (cast, key, value) => {
	try {
		if (value === null) {
			localStorage.setItem(key, JSON.stringify(null));
			return;
		}

		if (value === undefined) {
			localStorage.removeItem(key);
			return;
		}

		localStorage.setItem(key, JSON.stringify(cast(value)));
	} catch (error) {
		console.warn(error.stack);
	}
};

export const writeBoolean = (key, value) => writeValue(Boolean, key, value);
export const writeString = (key, value) => writeValue(String, key, value);
