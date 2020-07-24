import {
	CERTIFICATES_UPDATED,
	MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED,
	PERSISTABLE_VALUES_MERGED,
} from '../actions';

export const trustedCertificates = (state = {}, { type, payload }) => {
	switch (type) {
		case CERTIFICATES_UPDATED:
			return payload;

		case MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED:
			return {};

		case PERSISTABLE_VALUES_MERGED: {
			const { trustedCertificates = state } = payload;
			return trustedCertificates;
		}
	}

	return state;
};
