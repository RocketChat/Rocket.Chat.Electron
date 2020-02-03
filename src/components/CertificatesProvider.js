import React, { useEffect, createContext, useMemo, useContext } from 'react';
import { useDispatch } from 'react-redux';
import { put, takeEvery } from 'redux-saga/effects';

import {
	MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED,
	WEBVIEW_CERTIFICATE_TRUSTED,
	WEBVIEW_CERTIFICATE_DENIED,
	CERTIFICATES_CHANGED,
	CERTIFICATE_TRUST_REQUESTED,
} from '../actions';
import certificates from '../services/certificates';
import { useSaga } from './SagaMiddlewareProvider';

const CertificatesContext = createContext();

export function CertificatesProvider({ children, service = certificates }) {
	const certificates = service;

	const dispatch = useDispatch();

	useEffect(() => {
		certificates.addListener(certificates.constants.TRUST_REQUESTED_EVENT, ({
			webContentsId, requestedUrl, error, fingerprint, issuerName, willBeReplaced,
		}) => {
			dispatch({
				type: CERTIFICATE_TRUST_REQUESTED,
				payload: { webContentsId, requestedUrl, error, fingerprint, issuerName, willBeReplaced },
			});
		});

		certificates.setUp();

		window.addEventListener('beforeunload', ::certificates.tearDown);
		return ::certificates.tearDown;
	}, [certificates]);

	useSaga(function *() {
		yield takeEvery(MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED, function *() {
			certificates.clear();
		});

		yield takeEvery(WEBVIEW_CERTIFICATE_TRUSTED, function *({ payload: { fingerprint } }) {
			certificates.trust(fingerprint);
			yield put({ type: CERTIFICATES_CHANGED });
		});

		yield takeEvery(WEBVIEW_CERTIFICATE_DENIED, function *({ payload: { fingerprint } }) {
			certificates.deny(fingerprint);
			yield put({ type: CERTIFICATES_CHANGED });
		});
	}, [certificates]);

	const value = useMemo(() => ({
		handleCertificateError: ::certificates.handleCertificateError,
	}), [certificates]);

	return <CertificatesContext.Provider children={children} value={value} />;
}

export const useCertificateErrorHandler = () => useContext(CertificatesContext).handleCertificateError;
