import { Flex, Scrollable, Tile } from '@rocket.chat/fuselage';
import React from 'react';

import { useDialog } from '../../hooks/useDialog';
import { Wrapper } from './styles';

export function Dialog({ children, isVisible, onClose }) {
	const dialogRef = useDialog(isVisible, onClose);

	return <Wrapper ref={dialogRef}>
		<Flex.Container direction='column'>
			<Scrollable>
				<Tile elevation='2' padding='x32'>
					{children}
				</Tile>
			</Scrollable>
		</Flex.Container>
	</Wrapper>;
}
