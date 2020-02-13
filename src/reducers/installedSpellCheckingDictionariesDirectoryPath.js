import { SPELL_CHECKING_READY } from '../actions';

export const installedSpellCheckingDictionariesDirectoryPath = (state = null, { type, payload }) => {
	switch (type) {
		case SPELL_CHECKING_READY: {
			const { installedSpellCheckingDictionariesDirectoryPath } = payload;
			return installedSpellCheckingDictionariesDirectoryPath;
		}
	}

	return state;
};
