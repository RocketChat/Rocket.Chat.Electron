import React, { createContext, useContext, useEffect, useState } from 'react';
import { remote } from 'electron';

import { Certificates } from '../scripts/certificates';
import {
	MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED,
	WEBVIEW_CERTIFICATE_TRUSTED,
	WEBVIEW_CERTIFICATE_DENIED,
	CERTIFICATES_CHANGED,
	CERTIFICATE_TRUST_REQUESTED,
} from '../scripts/actions';

const CertificatesContext = createContext();

export function CertificatesProvider({
	children,
	dispatch,
	subscribe,
	initialize = () => new Certificates(),
}) {
	const [certificates] = useState(initialize);

	useEffect(() => {
		certificates.setUp();

		const handleActionDispatched = ({ type, payload }) => {
			switch (type) {
				case MENU_BAR_CLEAR_TRUSTED_CERTIFICATES_CLICKED: {
					certificates.clear();
					break;
				}

				case WEBVIEW_CERTIFICATE_TRUSTED: {
					const { fingerprint } = payload;
					certificates.trust(fingerprint);
					break;
				}

				case WEBVIEW_CERTIFICATE_DENIED: {
					const { fingerprint } = payload;
					certificates.deny(fingerprint);
					break;
				}
			}
		};

		const handleCertificatesChanged = () => dispatch({ type: CERTIFICATES_CHANGED });

		const handleCertificateTrustRequested = (payload) => dispatch({ type: CERTIFICATE_TRUST_REQUESTED, payload });

		const unsubscribeHandleActionDispatched = subscribe(handleActionDispatched);

		certificates.addListener(CERTIFICATES_CHANGED, handleCertificatesChanged);
		certificates.addListener(CERTIFICATE_TRUST_REQUESTED, handleCertificateTrustRequested);
		remote.app.addListener('certificate-error', certificates.handleCertificateError);

		const unsubscribe = () => {
			unsubscribeHandleActionDispatched();
			certificates.removeListener(CERTIFICATES_CHANGED, handleCertificatesChanged);
			certificates.removeListener(CERTIFICATE_TRUST_REQUESTED, handleCertificateTrustRequested);
			remote.app.removeListener('certificate-error', certificates.handleCertificateError);
		};

		window.addEventListener('unload', unsubscribe);

		return unsubscribe;
	}, [certificates]);

	return <CertificatesContext.Provider children={children} value={certificates} />;
}

export const useCertificates = () => useContext(CertificatesContext);
