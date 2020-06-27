import { Box, Margins, Tile, Grid, Icon } from '@rocket.chat/fuselage';
import React, { useEffect } from 'react';
import { Progress } from 'react-sweet-progress';
import 'react-sweet-progress/lib/style.css';

// recieve props for individual download item
export default function DownloadItem({ filename, filesize, url, percentage, timeDownloaded, serverTitle }) {
	console.log(percentage);
	return <Margins all='x32'>
		{/* <Grid md={true}> */ }
		<Tile elevation='2' style={ { width: '95%' } }>
			<Box height='11.5rem' width='100%' display='flex' alignItems='center'>
				<Grid.Item xl={ 2 } style={ { display: 'flex', alignItems: 'center', justifyContent: 'center' } }>
					<Box height='150px' width='150px' backgroundColor='lightgrey' borderRadius='10px' display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
						<Icon size='7rem' name='clip' />
						<Box fonScale='s2' color='primary-500' display='block'>.mp3</Box>
					</Box>
				</Grid.Item>
				<Grid.Item xl={ 9 } style={ { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-around', padding: '1.2rem 0' } }>
					<Box fontSize='h1' lineHeight='h1'>filename</Box>
					<Box display='flex' flexDirection='row' justifyContent='space-between' width='50%'>
						<Box fontSize='s2' color='info'>{serverTitle || '@Server'}</Box> <Box fontSize='s2' color='info'> { 'date' }</Box> <Box fontSize='s2' color='info'>{ 'filesize' || '25MB' }</Box>
					</Box>
					<Progress theme={ { default: { color: '#2F80ED' } } } percent={ 88 } status='default' />
					<Box fontSize='s2' >{ 'url' || 'https://google.com' }</Box>
					<a href='#' style={ { textDecoration: 'none', color: '#2F80ED' } }>Show in Folder</a>
				</Grid.Item>
				<Grid.Item xl={ 1 } style={ { display: 'flex', justifyContent: 'center' } }>
					<Icon name='cross' size='x32' />
				</Grid.Item>
			</Box>
		</Tile>

		{/* </Grid> */ }
	</Margins>;
}
