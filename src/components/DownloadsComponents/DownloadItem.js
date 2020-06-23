import { Box, Margins, Tile, Grid, Icon } from '@rocket.chat/fuselage';
import React, { useEffect } from 'react';
import { Progress } from 'react-sweet-progress';
import 'react-sweet-progress/lib/style.css';

// recieve props for individual download item
export default function DownloadItem({ filename, filesize, url, percentage, timeDownloaded }) {
	console.log(percentage);
	return <Margins all='x32'>
		<Tile elevation='2' style={ { width: '75%' } }>
			<Grid>
				{/* Box component styles not working properly */ }
				<Box height='16.5rem' width='100%' display='flex' alignItems='center'>
					<Grid.Item md={ 2 } style={ { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' } }>
						<div style={ { height: '200px', width: '200px', backgroundColor: 'lightgrey', borderRadius: '10px' } }></div>
						{/* <Box height='200px' width='200px' backgroundColor='lightgrey' borderRadius='10px' display='flex' justifyContent='center'>
							<Icon size='12rem' name='clip' />
						</Box> */}
					</Grid.Item>
					<Grid.Item style={ { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-around', padding: '1.2rem 0' } }>
						<h3>{ filename }</h3>
						<div style={ { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '75%' } }>
							<span>@Server</span> <span> { timeDownloaded }</span> <span>{ filesize || '25MB' }</span>
						</div>
						<Progress theme={ { default: { color: 'lightblue' } } } percent={ Math.floor(percentage) } status='default' />
						<a href={ url }>{ `${ url.substring(0, 50) }...` || 'https://google.com' }</a>
						<a href='#' style={ { textDecoration: 'none', color: '#2F80ED' } }> Show in Folder</a>
					</Grid.Item>
					<Grid.Item md='1' style={ { display: 'flex', justifyContent: 'center' } }>
						<Icon name='cross' size='x32' />
					</Grid.Item>
				</Box>
			</Grid>
		</Tile>
	</Margins>;
}
