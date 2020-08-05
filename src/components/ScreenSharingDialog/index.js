import { Box, Margins, Scrollable } from '@rocket.chat/fuselage';
import { desktopCapturer, ipcRenderer } from 'electron';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { SCREEN_SHARING_DIALOG_DISMISSED } from '../../actions';
import { EVENT_SCREEN_SHARING_SOURCE_SELECTED } from '../../ipc';
import { Dialog } from '../Dialog';
import { Source } from './styles';

export function ScreenSharingDialog() {
	const isVisible = useSelector(({ openDialog }) => openDialog === 'screen-sharing');
	const dispatch = useDispatch();

	const { t } = useTranslation();

	const [sources, setSources] = useState([]);

	useEffect(() => {
		if (!isVisible) {
			return;
		}

		const fetchSources = async () => {
			const sources = await desktopCapturer.getSources({ types: ['window', 'screen'] });
			setSources(sources);
		};

		const timer = setInterval(() => {
			fetchSources();
		}, 1000);

		return () => {
			clearInterval(timer);
		};
	}, [isVisible]);

	const handleScreenSharingSourceClick = (id) => () => {
		ipcRenderer.send(EVENT_SCREEN_SHARING_SOURCE_SELECTED, id);
		dispatch({ type: SCREEN_SHARING_DIALOG_DISMISSED });
	};

	const handleClose = () => {
		ipcRenderer.send(EVENT_SCREEN_SHARING_SOURCE_SELECTED, null);
		dispatch({ type: SCREEN_SHARING_DIALOG_DISMISSED });
	};

	return <Dialog isVisible={isVisible} onClose={handleClose}>
		<Box fontScale='h1' alignSelf='center'>{t('dialog.screenshare.announcement')}</Box>
		<Box display='flex' flexWrap='wrap' alignItems='stretch' justifyContent='center'>
			<Margins all='x8'>
				{sources.map(({ id, name, thumbnail }) => <Scrollable key={id}>
					<Source display='flex' flexDirection='column' onClick={handleScreenSharingSourceClick(id)}>
						<Box flexGrow={1} display='flex' alignItems='center'>
							<Box is='img' src={thumbnail.toDataURL()} alt={name} style={{ width: '100%' }} />
						</Box>
						<Box>{name}</Box>
					</Source>
				</Scrollable>)}
			</Margins>
		</Box>
	</Dialog>;
}
