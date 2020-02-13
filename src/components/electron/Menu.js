import { remote } from 'electron';
import React, {
	createContext,
	forwardRef,
	useCallback,
	useContext,
	useImperativeHandle,
	useRef,
} from 'react';

import { useElementsRefValues } from '../../hooks/useElementsRefValues';

const MenuContext = createContext(() => {});

export const useMenuInvalidation = () => useContext(MenuContext);

export const Menu = forwardRef(function Menu({
	children: menuItemsElements,
}, ref) {
	const innerRef = useRef();

	const [menuItems, clonedChildrenElements, setMenuItems] = useElementsRefValues(menuItemsElements);
	const parentInvalidate = useMenuInvalidation();
	const invalidate = useCallback(() => {
		setMenuItems((menuItems) => [...menuItems]);
		parentInvalidate();
	}, [parentInvalidate, setMenuItems]);

	useImperativeHandle(ref, () => {
		innerRef.current = new remote.Menu();

		menuItems.filter(Boolean).forEach((menuItem) => {
			innerRef.current.append(menuItem);
		});

		return innerRef.current;
	}, [menuItems]);

	return <MenuContext.Provider value={invalidate}>
		{clonedChildrenElements}
	</MenuContext.Provider>;
});
