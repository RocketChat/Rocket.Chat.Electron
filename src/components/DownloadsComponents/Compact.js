import { Box, Icon } from '@rocket.chat/fuselage';
import React from 'react';

import { Info, Progress, ActionButton } from '../DownloadsManagerView/downloadUtils';

export default React.memo(function Compact({
	serverTitle,
	mime,
	// date,
	fileName,
	fileSize,
	mbps,
	kbps,
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
	const speed = mbps > 0.1 ? `${ mbps }Mbps` : `${ kbps }Kbps`;
	const status = isCompleted ? 'Success' : props.status;
	return <Box width='100%' display='flex' justifyContent='center' flexDirection='column' alignItems='center' { ...props }>
		<Box display='flex' flexGrow={ 1 } width='100%'>
			<Box fontScale='s2' withTruncatedText flexGrow={ 1 }>{ fileName }</Box>
			<Box display='flex' justifyContent='space-between' alignItems='center'>
				{/* Completed */ }
				{ isCompleted && <ActionButton onClick={ handleFileOpen } title='Show in folder'><Icon name='chevron-up' /></ActionButton> }
				{/* Progressing and Paused */ }
				{ !isCompleted && !isCancelled && <ActionButton onClick={ handlePause } title={ isPaused ? 'Resume' : 'Pause' }>{ isPaused ? <Icon name='play' /> : <Icon name='pause' /> }</ActionButton> }
				{ !isCompleted && !isCancelled && <ActionButton onClick={ handleCancel } title='Cancel'><Icon name='circle-cross' /></ActionButton> }
				{/* Cancelled */ }
				{ isCancelled && <ActionButton onClick={ handleRetry } title='Retry'><Icon name='refresh' /></ActionButton> }
				<ActionButton onClick={ handleDelete } title='Remove'><Icon name='cross' /></ActionButton>

			</Box>
		</Box>
		<Box display='flex' flexGrow={ 1 } width='100%'>
			<Info withTruncatedText>{ serverTitle }</Info>
			<Info withTruncatedText mi='x8'>{ fileSize }</Info>
			{ isCompleted || <Info mi='x8'>{ speed }</Info> }
			<Progress percent={ percentage } status={ status } mi='x8' />
			{/* <Info withTruncatedText mi='x8'>{ date }</Info> */ }
			{/* <Box display='flex' alignItems='center'>
			<Icon name='kebab'/> */}
			{/* </Box> */ }
		</Box>
	</Box>;
});
