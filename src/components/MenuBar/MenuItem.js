import { remote } from 'electron';
import React, { forwardRef, useImperativeHandle, useRef, useLayoutEffect } from 'react';

import { useElementRefValue } from '../../hooks/useElementRefValue';

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
		onClickRef.current = onClick;
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

	useLayoutEffect(() => {
		innerRef.current.id = id;
	}, [id]);

	useLayoutEffect(() => {
		innerRef.current.enabled = enabled;
	}, [enabled]);

	useLayoutEffect(() => {
		innerRef.current.visible = visible;
	}, [visible]);

	useLayoutEffect(() => {
		innerRef.current.checked = checked;
	}, [checked]);

	useLayoutEffect(() => {
		innerRef.current.registerAccelerator = registerAccelerator;
	}, [registerAccelerator]);

	return <>
		{clonedSubmenu}
	</>;
});
