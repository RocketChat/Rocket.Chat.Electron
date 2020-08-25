import { Certificate } from 'electron';
import { Reducer } from 'redux';

import {
	CERTIFICATES_UPDATED,
	CERTIFICATES_CLEARED,
	PERSISTABLE_VALUES_MERGED,
	TrustedCertificatesActionTypes,
} from '../actions';
import { Server } from '../structs/servers';

export const trustedCertificates: Reducer<Record<Server['url'], Certificate['fingerprint']>, TrustedCertificatesActionTypes> = (state = {}, action) => {
	switch (action.type) {
		case CERTIFICATES_UPDATED:
			return action.payload;

		case CERTIFICATES_CLEARED:
			return {};

		case PERSISTABLE_VALUES_MERGED: {
			const { trustedCertificates = state } = action.payload;
			return trustedCertificates;
		}

		default:
			return state;
	}
};
