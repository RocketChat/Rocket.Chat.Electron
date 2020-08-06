import { AnyAction } from 'redux';

import {
	CERTIFICATES_UPDATED,
	CERTIFICATES_CLEARED,
	PERSISTABLE_VALUES_MERGED,
} from '../actions';

export const trustedCertificates = (state = {}, { type, payload }: AnyAction): Record<string, string> => {
	switch (type) {
		case CERTIFICATES_UPDATED:
			return payload;

		case CERTIFICATES_CLEARED:
			return {};

		case PERSISTABLE_VALUES_MERGED: {
			const { trustedCertificates = state } = payload;
			return trustedCertificates;
		}
	}

	return state;
};
