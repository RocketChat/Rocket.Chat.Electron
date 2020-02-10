import { remote } from 'electron';
import React, { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';

import { useElementRefValue } from '../../hooks/useElementRefValue';
import { useElementsRefValues } from '../../hooks/useElementsRefValues';

export const TouchBarBar = forwardRef(function TouchBarBar({
	children: itemsElements,
	escapeItem: escapeItemElement,
}, ref) {
	const [items, clonedItemsElements] = useElementsRefValues(itemsElements);
	const [escapeItem, clonedEscapeItem] = useElementRefValue(escapeItemElement);

	const innerRef = useRef();

	const escapeItemRef = useRef(escapeItem);
	useImperativeHandle(ref, () => {
		innerRef.current = new remote.TouchBar({
			items: items.filter(Boolean),
			escapeItem: escapeItemRef.current,
		});
		return innerRef.current;
	}, [items]);

	useLayoutEffect(() => {
		innerRef.current.escapeItem = escapeItem;
	}, [escapeItem]);

	return <>
		{clonedItemsElements}
		{clonedEscapeItem}
	</>;
});
