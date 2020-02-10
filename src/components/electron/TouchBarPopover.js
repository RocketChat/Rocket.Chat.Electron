import { remote } from 'electron';
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';

import { useElementRefValue } from '../../hooks/useElementRefValue';

export const TouchBarPopover = forwardRef(function TouchBarPopover({
	children: itemsElement,
	label,
	icon,
	hasCloseButton,
}, ref) {
	const innerRef = useRef();

	const [items, clonedItemsElement] = useElementRefValue(itemsElement);

	const labelRef = useRef(label);
	const iconRef = useRef(icon);
	useImperativeHandle(ref, () => {
		innerRef.current = new remote.TouchBar.TouchBarPopover({
			label: labelRef.current,
			icon: iconRef.current,
			items: items || {},
			showCloseButton: hasCloseButton,
		});
		return innerRef.current;
	}, [items, hasCloseButton]);

	useLayoutEffect(() => {
		innerRef.current.label = label;
	}, [label]);

	useLayoutEffect(() => {
		innerRef.current.icon = icon;
	}, [icon]);

	return clonedItemsElement;
});
