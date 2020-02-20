import { Box, Flex, Margins, Scrollable } from '@rocket.chat/fuselage';
import { desktopCapturer } from 'electron';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
	SCREEN_SHARING_DIALOG_SOURCE_SELECTED,
} from '../../actions';
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
		dispatch({ type: SCREEN_SHARING_DIALOG_SOURCE_SELECTED, payload: id });
	};

	return <Dialog isVisible={isVisible} onClose={() => dispatch({ type: SCREEN_SHARING_DIALOG_SOURCE_SELECTED, payload: null })}>
		<Flex.Item align='center'>
			<Box textStyle='h1'>{t('dialog.screenshare.announcement')}</Box>
		</Flex.Item>
		<Flex.Container wrap='wrap' alignItems='stretch' justifyContent='center'>
			<Box>
				<Margins all='x8'>
					{sources.map(({ id, name, thumbnail }) => <Scrollable key={id}>
						<Flex.Container direction='column'>
							<Source onClick={handleScreenSharingSourceClick(id)}>
								<Flex.Item grow={1}>
									<Flex.Container alignItems='center'>
										<Box>
											<Box is='img' src={thumbnail.toDataURL()} alt={name} style={{ width: '100%' }} />
										</Box>
									</Flex.Container>
								</Flex.Item>
								<Flex.Item grow={0}>
									<Box>{name}</Box>
								</Flex.Item>
							</Source>
						</Flex.Container>
					</Scrollable>)}
				</Margins>
			</Box>
		</Flex.Container>
	</Dialog>;
}
