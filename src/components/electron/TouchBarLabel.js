import { remote } from 'electron';
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';

export const TouchBarLabel = forwardRef(function TouchBarLabel({
	label,
	textColor,
}, ref) {
	const innerRef = useRef();

	const labelRef = useRef(label);
	const textColorRef = useRef(textColor);
	useImperativeHandle(ref, () => {
		innerRef.current = new remote.TouchBar.TouchBarLabel({
			label: labelRef.current,
			textColor: textColorRef.current,
		});
		return innerRef.current;
	}, []);

	useLayoutEffect(() => {
		innerRef.current.label = label;
	}, [label]);

	useLayoutEffect(() => {
		innerRef.current.textColor = textColor;
	}, [textColor]);

	return null;
});
