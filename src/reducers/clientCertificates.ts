import { AnyAction } from 'redux';

import {
	CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
	SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED,
	SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
} from '../actions';

export const clientCertificates = (state = [], action: AnyAction): unknown[] => {
	switch (action.type) {
		case CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED:
			return action.payload;

		case SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED:
		case SELECT_CLIENT_CERTIFICATE_DIALOG_DISMISSED:
			return [];
	}

	return state;
};
