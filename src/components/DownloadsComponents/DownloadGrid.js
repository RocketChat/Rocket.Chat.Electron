import React from 'react';
import { Box, Tile, Grid, Divider, SearchInput, Select, Icon, Tabs, Margins } from '@rocket.chat/fuselage';

import image from '../../download.png';

export default function DownloadGrid(props) {
	return <Margins all='x32'>
		<Grid sm={ true }>
			<Grid.Item sm={ 2 } style={ { display: 'flex', justifyContent: 'center', padding: '15px' } }>
				<Box height='200px' width='200px' borderRadius='10px' display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
					<img src={ image } width='175px' height='175px' alt="" style={ { borderRadius: '10px' } } />
					<Box fonScale='s2' display='block'>Pokemon.mp3</Box>

				</Box>
			</Grid.Item>
			<Grid.Item sm={ 2 } style={ { display: 'flex', justifyContent: 'center', padding: '15px' } }>
				<Box height='200px' width='200px' borderRadius='10px' display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
					<img src={ image } width='175px' height='175px' alt="" style={ { borderRadius: '10px' } } />
					<Box fonScale='s2' >Pokemon.mp3 <Icon name='kebab'></Icon></Box>
				</Box>
			</Grid.Item>
			<Grid.Item sm={ 2 } style={ { display: 'flex', justifyContent: 'center', padding: '15px' } }>
				<Box height='200px' width='200px' borderRadius='10px' display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
					<img src={ image } width='175px' height='175px' alt="" style={ { borderRadius: '10px' } } />
					<Box fonScale='s2' display='block'>Pokemon.mp3</Box>

				</Box>
			</Grid.Item>
			<Grid.Item sm={ 2 } style={ { display: 'flex', justifyContent: 'center', padding: '15px' } }>
				<Box height='200px' width='200px' borderRadius='10px' display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
					<img src={ image } width='175px' height='175px' alt="" style={ { borderRadius: '10px' } } />

					<Box fonScale='s2' display='block'>Pokemon.mp3</Box>
				</Box>
			</Grid.Item>
			<Grid.Item sm={ 2 } style={ { display: 'flex', justifyContent: 'center', padding: '15px' } }>
				<Box height='200px' width='200px' borderRadius='10px' display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
					<img src={ image } width='175px' height='175px' alt="" style={ { borderRadius: '10px' } } />

					<Box fonScale='s2' display='block'>Pokemon.mp3</Box>
				</Box>
			</Grid.Item>
		</Grid>
	</Margins>;
}