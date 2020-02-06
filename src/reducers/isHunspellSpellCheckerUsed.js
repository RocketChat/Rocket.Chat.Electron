import { SPELL_CHECKING_PARAMETERS_SET } from '../actions';

export const isHunspellSpellCheckerUsed = (state = false, { type, payload }) => {
	switch (type) {
		case SPELL_CHECKING_PARAMETERS_SET: {
			const { isHunspellSpellCheckerUsed } = payload;
			return isHunspellSpellCheckerUsed;
		}
	}

	return state;
};
