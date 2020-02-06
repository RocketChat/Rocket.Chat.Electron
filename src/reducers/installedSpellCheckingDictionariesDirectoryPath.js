import { SPELL_CHECKING_PARAMETERS_SET } from '../actions';

export const installedSpellCheckingDictionariesDirectoryPath = (state = null, { type, payload }) => {
	switch (type) {
		case SPELL_CHECKING_PARAMETERS_SET: {
			const { installedSpellCheckingDictionariesDirectoryPath } = payload;
			return installedSpellCheckingDictionariesDirectoryPath;
		}
	}

	return state;
};
