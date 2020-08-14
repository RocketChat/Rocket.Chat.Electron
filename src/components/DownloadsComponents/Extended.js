
import React from 'react';
import { Box, Icon, ButtonGroup, Avatar } from '@rocket.chat/fuselage';

import { Info, Progress, ActionButton } from '../DownloadsManagerView/downloadUtils';


export default React.memo(function Extended({
	thumbnail,
	serverTitle,
	mime,
	date,
	fileName,
	fileSize,
	mbps,
	percentage,
	isCompleted,
	isPaused,
	isCancelled,
	handleFileOpen,
	handleCopyLink,
	handlePause,
	handleCancel,
	handleRetry,
	handleDelete,
	...props
}) {
	return <Box width='100%' display='flex' alignItems='center' { ...props }>
		{/* USE AVATAR FUSELAGE (TODO) */ }

		{ thumbnail ? <Avatar url={ thumbnail } size='x124' /> : <Box size='x124' flexShrink={ 0 } bg='neutral-500-50' borderRadius='4px' display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
			<Icon size='x60' name='clip' />
			<Box fontScale='s2' color='primary-500' display='block'>{ mime }</Box>
		</Box> }

		<Box display='flex' flexDirection='column' flexGrow={ 1 } mi='x16'>
			<Box fontSize='s2' withTruncatedText color='default' pbe='x8'>{ fileName }</Box>
			<Box display='flex' flexDirection='row' justifyContent='space-between' mb='x8'>
				<Info>{ serverTitle }</Info>
				<Info> { date }</Info>
				<Info>{ fileSize || '25MB' }</Info>
				{ mbps > 0 && <Info>{ `${ mbps }Mbps/s` }</Info> }
				{/* ESTIMATED (TODO) */ }
				{/* <Box fontSize='s2' color='info'>{ '60s Left' }</Box> */ }
			</Box>
			<Box mb='x8'>
				<Progress percent={ percentage } />
			</Box>
			{/* // TODO: Implement Show in Folder */ }
			<ButtonGroup>
				{/* Completed */ }
				{ isCompleted && <ActionButton onClick={ handleFileOpen }>Show in Folder</ActionButton> }
				{ isCompleted && <ActionButton onClick={ handleCopyLink }>Copy Link</ActionButton> }
				{/* Progressing and Paused */ }
				{ !isCompleted && !isCancelled && <ActionButton onClick={ handlePause }>{ isPaused ? 'Resume' : 'Pause' }</ActionButton> }
				{ !isCompleted && !isCancelled && <ActionButton onClick={ handleCancel }>Cancel</ActionButton> }
				{/* Cancelled */ }
				{ isCancelled && <ActionButton onClick={ handleRetry }>Retry</ActionButton> }
				<ActionButton onClick={ handleDelete }>Delete</ActionButton>
			</ButtonGroup>
		</Box>
	</Box>;
});
