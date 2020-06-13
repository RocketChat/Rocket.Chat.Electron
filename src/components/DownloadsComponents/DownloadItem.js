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
	Icon,
} from '@rocket.chat/fuselage';
import React, { useEffect } from 'react';
import { Progress } from 'react-sweet-progress';
import 'react-sweet-progress/lib/style.css';

// recieve props for individual download item
export default function DownloadItem({ filename, filesize, url }) {
	// const date = new Date().toLocaleTimeString();

	return <Margins all='x32'>
		<Tile elevation='2' style={ { width: '75%' } }>
			<Grid>
				{/* Box component styles not working properly */}
				<Box height='16.5rem' width='100%' display='flex' alignItems='center'>
					<Grid.Item md={ 2 } style={ { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' } }>
						<div style={ { height: '200px', width: '200px', backgroundColor: 'lightblue', borderRadius: '10px' } }></div>
					</Grid.Item>
					<Grid.Item style={ { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-around', padding: '1.2rem 0' } }>
						<h3>{ 'filename' }</h3>
						<div style={ { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '75%' } }>
							<span>@Server</span> <span> { 'date' }</span> <span>{ 'filesize' || '25MB' }</span>
						</div>
						<Progress theme={ { default: { color: 'lightblue' } } } percent={ 88 } status='default' />
						<p>{ 'url' || 'https://google.com' }</p>
						<a href='#'> Show in Folder</a>
					</Grid.Item>
					<Grid.Item md='1'>
						<Icon name='cross' size='x64' />
					</Grid.Item>
				</Box>
			</Grid>
		</Tile>
	</Margins>;
}
