import { remote } from 'electron';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';

import { useElementsRefValues } from '../../hooks/useElementsRefValues';

export const Menu = forwardRef(function Menu({
	children: menuItemsElements,
}, ref) {
	const innerRef = useRef();

	const [menuItems, clonedChildrenElements] = useElementsRefValues(menuItemsElements);

	useImperativeHandle(ref, () => {
		innerRef.current = new remote.Menu();

		menuItems.filter(Boolean).forEach((menuItem) => {
			innerRef.current.append(menuItem);
		});
		return innerRef.current;
	}, [menuItems]);

	return <>
		{clonedChildrenElements}
	</>;
});
