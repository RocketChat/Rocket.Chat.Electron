import { call, put, select } from 'redux-saga/effects';

import { CERTIFICATES_READY } from '../actions';
import { readFromStorage } from '../localStorage';
import { readConfigurationFile } from '../sagaUtils';

const loadUserTrustedCertificates = async (trustedCertificates) => {
	const userTrustedCertificates = await readConfigurationFile('certificate.json', { appData: false, purgeAfter: true });

	if (!userTrustedCertificates) {
		return;
	}

	try {
		for (const [host, certificate] of Object.entries(userTrustedCertificates)) {
			trustedCertificates[host] = certificate;
		}
	} catch (error) {
		console.warn(error);
	}
};

function *loadTrustedCertificates() {
	const trustedCertificates = yield select(({ trustedCertificates }) => trustedCertificates);

	yield call(loadUserTrustedCertificates, trustedCertificates);

	Object.assign(trustedCertificates, readFromStorage('trustedCertificates', {}));

	return trustedCertificates;
}

export function *navigationEventsSaga() {
	const trustedCertificates = yield call(loadTrustedCertificates);

	yield put({
		type: CERTIFICATES_READY,
		payload: trustedCertificates,
	});
}
