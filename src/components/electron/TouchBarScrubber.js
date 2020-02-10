import { remote } from 'electron';
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';

export const TouchBarScrubber = forwardRef(function TouchBarScrubber({
	items,
	continuous,
	mode,
	overlayStyle,
	selectedStyle,
	hasArrowButtons,
	onHighlight,
	onSelect,
}, ref) {
	const innerRef = useRef();

	const itemsRef = useRef(items);
	const continuousRef = useRef(continuous);
	const modeRef = useRef(mode);
	const overlayStyleRef = useRef(overlayStyle);
	const selectedStyleRef = useRef(selectedStyle);
	const showArrowButtonsRef = useRef(hasArrowButtons);

	const onHighlightRef = useRef(onHighlight);
	const onSelectRef = useRef(onSelect);

	useLayoutEffect(() => {
		onHighlightRef.current = onHighlight;
		onSelectRef.current = onSelect;
	});

	useImperativeHandle(ref, () => {
		innerRef.current = new remote.TouchBar.TouchBarScrubber({
			items: itemsRef.current,
			continuous: continuousRef.current,
			mode: modeRef.current,
			overlayStyle: overlayStyleRef.current,
			selectedStyle: selectedStyleRef.current,
			showArrowButtons: showArrowButtonsRef.current,
			highlight: (...args) => onHighlightRef.current && (0, onHighlightRef.current)(...args),
			select: (...args) => onSelectRef.current && (0, onSelectRef.current)(...args),
		});
		return innerRef.current;
	}, []);

	useLayoutEffect(() => {
		innerRef.current.items = items;
	}, [items]);

	useLayoutEffect(() => {
		innerRef.current.selectedStyle = selectedStyle;
	}, [selectedStyle]);

	useLayoutEffect(() => {
		innerRef.current.overlayStyle = overlayStyle;
	}, [overlayStyle]);

	useLayoutEffect(() => {
		innerRef.current.showArrowButtons = hasArrowButtons;
	}, [hasArrowButtons]);

	useLayoutEffect(() => {
		innerRef.current.mode = mode;
	}, [mode]);

	useLayoutEffect(() => {
		innerRef.current.continuous = continuous;
	}, [continuous]);

	return null;
});
