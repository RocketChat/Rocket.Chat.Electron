import { useMergedRefs } from '@rocket.chat/fuselage-hooks';
import React, { forwardRef, useRef, useLayoutEffect } from 'react';

export const WebViewComponent = forwardRef(function WebViewComponent({
	className,
	src,
	onWebContentsChange,
}, ref) {
	const innerRef = useRef();
	const mergedRef = useMergedRefs(ref, innerRef);

	const webContentsChangeEventRef = useRef();
	useLayoutEffect(() => {
		webContentsChangeEventRef.current = onWebContentsChange;
	}, [onWebContentsChange]);

	const webContentsRef = useRef(null);

	useLayoutEffect(() => {
		innerRef.current.addEventListener('did-attach', () => {
			const webContents = innerRef.current.getWebContents();
			webContentsRef.current = webContents;

			webContentsChangeEventRef.current && (0, webContentsChangeEventRef.current)(webContents);
		});

		innerRef.current.addEventListener('destroyed', () => {
			webContentsRef.current = null;
			webContentsChangeEventRef.current && (0, webContentsChangeEventRef.current)(null);
		});
	}, []);

	useLayoutEffect(() => {
		innerRef.current.src = src;
	}, [src]);

	return <webview
		ref={mergedRef}
		className={className}
	/>;
});
