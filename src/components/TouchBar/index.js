import { remote } from 'electron';
import React, { useEffect, useState } from 'react';

import { TouchBarBar } from '../electron/TouchBarBar';
import { TouchBarSpacer } from '../electron/TouchBarSpacer';
import { MessageBoxFormattingButtons } from './MessageBoxFormattingButtons';
import { ServerSelectionPopover } from './ServerSelectionPopover';

export function TouchBar() {
	const [bar, setBar] = useState(null);

	useEffect(() => {
		remote.getCurrentWindow().setTouchBar(bar);
	}, [bar]);

	return <TouchBarBar ref={setBar}>
		<ServerSelectionPopover />
		<TouchBarSpacer size='flexible' />
		<MessageBoxFormattingButtons />
		<TouchBarSpacer size='flexible' />
	</TouchBarBar>;
}
