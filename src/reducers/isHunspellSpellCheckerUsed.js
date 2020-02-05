import { SPELL_CHECKING_READY } from '../actions';

export const isHunspellSpellCheckerUsed = (state = false, { type, payload }) => {
	switch (type) {
		case SPELL_CHECKING_READY: {
			const { isHunspellSpellCheckerUsed } = payload;
			return isHunspellSpellCheckerUsed;
		}
	}

	return state;
};
