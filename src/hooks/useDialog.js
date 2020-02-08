import { useEffect, useRef } from 'react';

export const useDialog = (visible, onClose = () => {}) => {
	const dialogRef = useRef();
	const onCloseRef = useRef();

	useEffect(() => {
		onCloseRef.current = onClose;
	});

	useEffect(() => {
		const dialog = dialogRef.current;
		const onClose = onCloseRef.current;

		if (!visible) {
			dialog.close();
			return;
		}

		dialog.showModal();

		dialog.onclose = () => {
			dialog.close();
			onClose();
		};

		dialog.onclick = ({ clientX, clientY }) => {
			const { left, top, width, height } = dialog.getBoundingClientRect();
			const isInDialog = top <= clientY && clientY <= top + height && left <= clientX && clientX <= left + width;
			if (!isInDialog) {
				dialog.close();
			}
		};
	}, [visible]);

	return dialogRef;
};
