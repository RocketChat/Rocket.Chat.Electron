import {
	SPELL_CHECKING_READY,
	WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED,
	SPELL_CHECKING_DICTIONARY_ADDED,
} from '../actions';

const compare = ({ name: a }, { name: b }) => a.localeCompare(b);

export const spellCheckingDictionaries = (state = [], { type, payload }) => {
	switch (type) {
		case SPELL_CHECKING_READY: {
			const { spellCheckingDictionaries } = payload;
			return spellCheckingDictionaries.sort(compare);
		}

		case WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED: {
			const { dictionaryName, enabled } = payload;
			return state.map((dictionary) => {
				if (dictionaryName === dictionary.name) {
					return {
						...dictionary,
						enabled,
					};
				}

				return dictionary;
			});
		}

		case SPELL_CHECKING_DICTIONARY_ADDED: {
			const dictionaryName = payload;
			return [...state, {
				name: dictionaryName,
				installed: true,
				enabled: false,
			}].sort(compare);
		}

		default:
			return state;
	}
};
