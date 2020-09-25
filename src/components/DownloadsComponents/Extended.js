
import React from 'react';
import { Box, Icon, ButtonGroup, ProgressBar } from '@rocket.chat/fuselage';

import { Info, Progress, ActionButton } from '../DownloadsManagerView/downloadUtils';


export default React.memo(function Extended({
	thumbnail,
	serverTitle,
	mime,
	// date,
	fileName,
	fileSize,
	mbps,
	kbps,
	timeLeft,
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
	return <Box width='100%' height='x44' mbe='x26' display='flex' alignItems='center' { ...props }>

		<Box width='x188' flexShrink={ 0 } borderRadius='4px' display='flex' flexDirection='row' alignItems='center' justifyContent='center'>
			<Box display='flex' flexDirection='column' width='x36' height='x44'>
				<Box is='img' src='images/file-icon.svg' alt={name} width='x36' />
				<Box fontSize='x12' fontWeight='600' textAlign='center' mbs='-20px' color='neutral-600' display='block'>{ mime }</Box>
			</Box>
			<Box width='x144' mis='x8'>
				<Box fontSize='x14' withTruncatedText color={ isCancelled ? 'danger-500' : 'default' } mbe='x4'>{ fileName }</Box>
				<Info>{ serverTitle }</Info>
			</Box>
		</Box>

		<Box display='flex' flexDirection='column' flexGrow={ 1 } mi='x16'>
			
			<Box display='flex' flexDirection='row' mbe='x6' alignItems='center' justifyContent='space-between'>
				<Box display='flex' flexDirection='row' alignItems='center'>
					<Info mie='x12'>{percentage}% of { fileSize }</Info>
					{ isCompleted || isCancelled || <Info mie='x12'>{ speed }</Info> }
					{ timeLeft && <Info>{ timeLeft }s left</Info> }
				</Box>

				<ButtonGroup fontSize='x12' withTruncatedText color='neutral-700' >
					{/* Completed */ }
					{ isCompleted && !isCancelled && <ActionButton onClick={ handleFileOpen }>Show in Folder</ActionButton> }
					{ isCompleted && !isCancelled && <ActionButton onClick={ handleCopyLink }>Copy Link</ActionButton> }
					{/* Progressing and Paused */ }
					{ !isCompleted && !isCancelled && <ActionButton onClick={ handlePause }>{ isPaused ? 'Resume' : 'Pause' }</ActionButton> }
					{ !isCompleted && !isCancelled && <ActionButton onClick={ handleCancel }>Cancel</ActionButton> }
					{/* Cancelled */ }
					{ isCancelled && <ActionButton onClick={ handleRetry }>Retry</ActionButton> }
					<ActionButton isRemove onClick={ () => handleDelete(false) }>Remove from List</ActionButton>
				</ButtonGroup>
			</Box>
			<Box mbe='x8'>
				<ProgressBar percentage={ percentage } error = { isCancelled && 'Download Cancelled' } />
			</Box>

			
		</Box>
	</Box>;
});
