import {
	CERTIFICATES_READY,
	CERTIFICATES_UPDATED,
	MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED,
} from '../actions';

export const trustedCertificates = (state = {}, { type, payload }) => {
	switch (type) {
		case CERTIFICATES_READY:
			return payload;

		case CERTIFICATES_UPDATED:
			return payload;

		case MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED:
			return {};
	}

	return state;
};
