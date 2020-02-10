import { remote } from 'electron';
import mem from 'mem';
import React, { useMemo, forwardRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { TouchBarSegmentedControl } from '../electron/TouchBarSegmentedControl';
import { TOUCH_BAR_FORMAT_BUTTON_TOUCHED } from '../../actions';

const getNativeImageFromPath = mem((path) => remote.nativeImage.createFromPath(path));

export const MessageBoxFormattingButtons = forwardRef(function MessageBoxFormattingButtons(_, ref) {
	const isMessageBoxFocused = useSelector(({ isMessageBoxFocused }) => isMessageBoxFocused);
	const ids = useMemo(() => ['bold', 'italic', 'strike', 'inline_code', 'multi_line'], []);
	const dispatch = useDispatch();

	return <TouchBarSegmentedControl
		ref={ref}
		mode='buttons'
		segments={useMemo(() => ids.map((id) => ({
			icon: getNativeImageFromPath(`${ remote.app.getAppPath() }/app/public/images/touch-bar/${ id }.png`),
			enabled: isMessageBoxFocused,
		})), [ids, isMessageBoxFocused])}
		onChange={(selectedIndex) => dispatch({ type: TOUCH_BAR_FORMAT_BUTTON_TOUCHED, payload: ids[selectedIndex] })}
	/>;
});
