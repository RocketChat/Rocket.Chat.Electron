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
	Divider,
} from '@rocket.chat/fuselage';
// import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { remote, ipcRenderer } from 'electron';

import { Wrapper, Content, Title, Subtitle } from './styles';
import DownloadsList from '../DownloadsComponents/DownloadsList';

export function DownloadsManagerView() {
	const isVisible = useSelector(({ currentServerUrl }) => currentServerUrl === 'Downloads');

	// const [url, setUrl] = useState('');
	// const [filename, setFileName] = useState('');
	// const [filesize, setFileSize] = useState(0);

	// useEffect(() => {
	// 	const handleFileSize = (event, totalsize) => {
	// 		console.log('hello yes changed');
	// 		setFileSize(totalsize);
	// 		console.log(totalsize);
	// 		console.log(filesize);
	// 	};

	// 	ipcRenderer.on('download-complete', handleFileSize);
	// 	return () => {
	// 		ipcRenderer.removeListener('download-complete', handleFileSize);
	// 	};
	// }, []);

	return <Wrapper isVisible={ isVisible }>
		<Content>
			<Grid xl={ true } style={ { display: 'flex', justifyContent: 'center' } }>

				<Box width='70%' display='flex' flexDirection='row'>
					<Grid.Item xl={ 8 }>
						<Tile>
							<Box paddingInlineStart='9.375rem'>
								<h1>Downloads</h1>
								<h3>See all your downloads here</h3>
							</Box>
						</Tile>
					</Grid.Item>
					<Grid.Item xl={ 4 }>
					</Grid.Item>
				</Box>

				<Grid.Item xl={ 9 } width='75%'>
					<Divider />
				</Grid.Item>
				<Grid.Item xl={ 12 } style={ { display: 'flex', flexDirection: 'column', alignItems: 'center' } }>
					<DownloadsList items={ [1, 2, 3] } />
				</Grid.Item>

			</Grid>
		</Content>
	</Wrapper>;
}
