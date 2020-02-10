import { remote } from 'electron';
import React, { useEffect, useRef } from 'react';

import { TouchBarBar } from '../electron/TouchBarBar';
import { TouchBarSpacer } from '../electron/TouchBarSpacer';
import { MessageBoxFormattingButtons } from './MessageBoxFormattingButtons';
import { ServerSelectionPopover } from './ServerSelectionPopover';

export function TouchBar() {
	const barRef = useRef();
	const prevBarRef = useRef();
	useEffect(() => {
		if (prevBarRef.current === barRef.current) {
			return;
		}

		remote.getCurrentWindow().setTouchBar(barRef.current);
		prevBarRef.current = barRef.current;
	});

	return <TouchBarBar ref={barRef}>
		<ServerSelectionPopover />
		<TouchBarSpacer size='flexible' />
		<MessageBoxFormattingButtons />
		<TouchBarSpacer size='flexible' />
	</TouchBarBar>;
}
