import { remote } from 'electron';
import { forwardRef, useImperativeHandle, useRef, useLayoutEffect } from 'react';

import { useElementRefValue } from '../../hooks/useElementRefValue';
import { useMenuInvalidation } from './Menu';

export const MenuItem = forwardRef(function MenuItem({
	children: submenuElement,
	accelerator,
	acceleratorWorksWhenHidden,
	after,
	afterGroupContaining,
	before,
	beforeGroupContaining,
	checked,
	enabled,
	icon,
	id,
	label,
	registerAccelerator,
	role,
	sublabel,
	toolTip,
	type,
	visible,
	onClick,
}, ref) {
	const innerRef = useRef();

	const [submenu, clonedSubmenu] = useElementRefValue(submenuElement);

	const checkedRef = useRef(checked);
	const onClickRef = useRef(onClick);
	const enabledRef = useRef(enabled);
	const idRef = useRef(id);
	const registerAcceleratorRef = useRef(registerAccelerator);
	const visibleRef = useRef(visible);

	useLayoutEffect(() => {
		checkedRef.current = checked;
		onClickRef.current = onClick;
		enabledRef.current = enabled;
		idRef.current = id;
		registerAcceleratorRef.current = registerAccelerator;
		visibleRef.current = visible;
	});

	useImperativeHandle(ref, () => {
		innerRef.current = new remote.MenuItem({
			accelerator,
			acceleratorWorksWhenHidden,
			after,
			afterGroupContaining,
			before,
			beforeGroupContaining,
			checked: checkedRef.current,
			click: (...args) => onClickRef.current && (0, onClickRef.current)(...args),
			enabled: enabledRef.current,
			icon,
			id: idRef.current,
			label,
			registerAccelerator: registerAcceleratorRef.current,
			role,
			sublabel,
			submenu,
			toolTip,
			type,
			visible: visibleRef.current,
		});
		return innerRef.current;
	}, [
		accelerator,
		acceleratorWorksWhenHidden,
		after,
		afterGroupContaining,
		before,
		beforeGroupContaining,
		icon,
		label,
		role,
		sublabel,
		submenu,
		toolTip,
		type,
	]);

	const invalidateParent = useMenuInvalidation();

	useLayoutEffect(() => {
		innerRef.current.id = id;
		invalidateParent();
	}, [id, invalidateParent]);

	useLayoutEffect(() => {
		innerRef.current.enabled = enabled;
		invalidateParent();
	}, [enabled, invalidateParent]);

	useLayoutEffect(() => {
		innerRef.current.visible = visible;
		invalidateParent();
	}, [invalidateParent, visible]);

	useLayoutEffect(() => {
		innerRef.current.checked = checked;
		invalidateParent();
	}, [checked, invalidateParent]);

	useLayoutEffect(() => {
		innerRef.current.registerAccelerator = registerAccelerator;
		invalidateParent();
	}, [invalidateParent, registerAccelerator]);

	return clonedSubmenu;
});
