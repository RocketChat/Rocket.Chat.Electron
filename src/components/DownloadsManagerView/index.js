import {
	Box,
	Button,
	ButtonGroup,
	Callout,
	Field,
	FieldGroup,
	Margins,
	TextInput,
	Tile,
	Grid,
} from '@rocket.chat/fuselage';
// import { useTranslation } from 'react-i18next';
import React from 'react';
import { useSelector } from 'react-redux';

import { Wrapper, Content, Title, Subtitle } from './styles';
import DownloadItem from '../DownloadsComponents/DownloadItem';

export function DownloadsManagerView() {
	const isVisible = useSelector(({ currentServerUrl }) => currentServerUrl === 'Downloads');
	return <Wrapper isVisible={isVisible}>
		<Content>
			<Grid xl={true}>
				<Grid.Item xl='8'>
					<Tile>
						<Title>Downloads Manager</Title>
						<Subtitle>See all your downloads here</Subtitle>
					</Tile>
				</Grid.Item>
				<Grid.Item xl='4'>

				</Grid.Item>
				<Grid.Item>
					<DownloadItem>
					</DownloadItem>
				</Grid.Item>
			</Grid>
		</Content>
	</Wrapper>;
}
