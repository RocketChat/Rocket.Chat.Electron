import { Scrollable, Tile } from '@rocket.chat/fuselage';
import React from 'react';

import { useDialog } from '../../hooks/useDialog';
import { Wrapper } from './styles';

export function Dialog({ children, isVisible, onClose }) {
	const dialogRef = useDialog(isVisible, onClose);

	return <Wrapper ref={dialogRef}>
		<Scrollable>
			<Tile elevation='2' padding='x32' display='flex' flexDirection='column'>
				{children}
			</Tile>
		</Scrollable>
	</Wrapper>;
}
