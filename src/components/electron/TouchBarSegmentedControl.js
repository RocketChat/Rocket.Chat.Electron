import { remote } from 'electron';
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';

export const TouchBarSegmentedControl = forwardRef(function TouchBarSegmentedControl({
	segments,
	mode,
	segmentStyle,
	selectedIndex,
	onChange,
}, ref) {
	const innerRef = useRef();

	const segmentStyleRef = useRef(segmentStyle);
	const segmentsRef = useRef(segments);
	const selectedIndexRef = useRef(selectedIndex);
	const onChangeRef = useRef(onChange);

	useLayoutEffect(() => {
		onChangeRef.current = onChange;
	});

	useImperativeHandle(ref, () => {
		innerRef.current = new remote.TouchBar.TouchBarSegmentedControl({
			mode,
			segments: segmentsRef.current,
			segmentStyle: segmentStyleRef.current,
			selectedIndex: selectedIndexRef.current,
			change: (...args) => onChangeRef.current && (0, onChangeRef.current)(...args),
		});
		return innerRef.current;
	}, [mode]);

	useLayoutEffect(() => {
		innerRef.current.segmentStyle = segmentStyle;
	}, [segmentStyle]);

	useLayoutEffect(() => {
		innerRef.current.segments = segments;
	}, [segments]);

	useLayoutEffect(() => {
		innerRef.current.selectedIndex = selectedIndex;
	}, [selectedIndex]);

	return null;
});
