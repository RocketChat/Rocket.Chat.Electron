import { remote } from 'electron';
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';

export const TouchBarButton = forwardRef(function TouchBarGroup({
	label,
	backgroundColor,
	icon,
	iconPosition,
	onClick,
}, ref) {
	const innerRef = useRef();

	const labelRef = useRef(label);
	const backgroundColorRef = useRef(backgroundColor);
	const iconRef = useRef(icon);

	const onClickRef = useRef(onClick);

	useLayoutEffect(() => {
		onClickRef.current = onClick;
	});

	useImperativeHandle(ref, () => {
		innerRef.current = new remote.TouchBar.TouchBarButton({
			label: labelRef.current,
			backgroundColor: backgroundColorRef.current,
			icon: iconRef.current,
			iconPosition,
			click: (...args) => onClickRef.current && (0, onClickRef.current)(...args),
		});
		return innerRef.current;
	}, [iconPosition]);

	useLayoutEffect(() => {
		innerRef.current.label = label;
	}, [label]);

	useLayoutEffect(() => {
		innerRef.current.backgroundColor = backgroundColor;
	}, [backgroundColor]);

	useLayoutEffect(() => {
		innerRef.current.icon = icon;
	}, [icon]);

	return null;
});
