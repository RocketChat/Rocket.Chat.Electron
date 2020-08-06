import { Box, Button, Margins, Scrollable, Tile } from '@rocket.chat/fuselage';
import { ipcRenderer } from 'electron';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';

import {
	CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED,
	SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED,
} from '../../actions';
import { EVENT_CLIENT_CERTIFICATE_REQUESTED, EVENT_CLIENT_CERTIFICATE_SELECTED } from '../../ipc';
import { Dialog } from '../Dialog';

export function SelectClientCertificateDialog() {
	const isVisible = useSelector(({ openDialog }) => openDialog === 'select-client-certificate');
	const [certificateList, setCertificateList] = useState([]);
	const dispatch = useDispatch();

	useEffect(() => {
		const handleClientCertificateRequestedEvent = (event, certificateList) => {
			setCertificateList(certificateList);
			dispatch({ type: CERTIFICATES_CLIENT_CERTIFICATE_REQUESTED });
		};

		ipcRenderer.addListener(EVENT_CLIENT_CERTIFICATE_REQUESTED, handleClientCertificateRequestedEvent);

		return () => {
			ipcRenderer.removeListener(EVENT_CLIENT_CERTIFICATE_REQUESTED, handleClientCertificateRequestedEvent);
		};
	}, [dispatch]);

	const handleClose = () => {
		setCertificateList([]);
	};

	const handleSelect = (certificate) => () => {
		ipcRenderer.send(EVENT_CLIENT_CERTIFICATE_SELECTED, certificate.fingerprint);
		dispatch({ type: SELECT_CLIENT_CERTIFICATE_DIALOG_CERTIFICATE_SELECTED });
	};

	const { t } = useTranslation();

	return <Dialog isVisible={isVisible} onClose={handleClose}>
		<Box fontScale='h1'>{t('dialog.selectClientCertificate.announcement')}</Box>
		<Margins inline='neg-x12'>
			<Scrollable>
				<Box>
					<Margins all='x12'>
						{certificateList.map((certificate, i) => <Tile key={i}>
							<Margins inline='neg-x8'>
								<Box display='flex' alignItems='end' justifyContent='space-between'>
									<Margins inline='x8'>
										<Box>
											<Box fontScale='s1'>
												{certificate.subjectName}
											</Box>
											<Box fontScale='p2'>
												{certificate.issuerName}
											</Box>
											<Box fontScale='c1'>
												{t('dialog.selectClientCertificate.validDates', {
													validStart: new Date(certificate.validStart * 1000),
													validExpiry: new Date(certificate.validExpiry * 1000),
												})}
											</Box>
										</Box>
										<Button primary flexShrink={1} onClick={handleSelect(certificate)}>
											{t('dialog.selectClientCertificate.select')}
										</Button>
									</Margins>
								</Box>
							</Margins>
						</Tile>)}
					</Margins>
				</Box>
			</Scrollable>
		</Margins>
	</Dialog>;
}
