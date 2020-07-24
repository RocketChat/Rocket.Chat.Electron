import {
	WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED,
	SPELL_CHECKING_DICTIONARIES_UPDATED,
	PERSISTABLE_VALUES_MERGED,
} from '../actions';

const compare = ({ name: a }, { name: b }) => a.localeCompare(b);

export const spellCheckingDictionaries = (state = [], { type, payload }) => {
	switch (type) {
		case WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED: {
			const { name, enabled } = payload;
			return state.map((dictionary) => {
				if (name === dictionary.name) {
					return {
						...dictionary,
						enabled,
					};
				}

				return enabled ? { ...dictionary, enabled: false } : dictionary;
			});
		}

		case SPELL_CHECKING_DICTIONARIES_UPDATED:
			return payload.sort(compare);

		case PERSISTABLE_VALUES_MERGED: {
			const { spellCheckingDictionaries = state } = payload;
			return spellCheckingDictionaries.sort(compare);
		}

		default:
			return state;
	}
};
