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

import React from 'react';


export default function DownloadItem() {
	return <Box height='x200' width='100%'>
		<Grid md={true}>
			<Grid.Item md='2'>
				<Box height='200px' width='200px'>
					<img src='' alt='' style={{ height: '200px', width: '200px' }} />
				</Box>
			</Grid.Item>
			<Grid.Item md='4'>
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
					<h3>Filename.png</h3>
					<div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
						<span>@Server</span> <span>11:00PM</span> <span>25MB</span>
					</div>
					<p>https://google.com</p>
					<a href='#'>Show in Folder</a>
				</div>
			</Grid.Item>
			<Grid.Item md='1'>
				<div style={{ display: 'flex', justifyContent: 'center' }}>
					<Icon name='cross' />
				</div>
			</Grid.Item>
		</Grid>
	</Box>;
}
