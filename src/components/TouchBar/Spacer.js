import { remote } from 'electron';
import { forwardRef, useImperativeHandle } from 'react';

export const Spacer = forwardRef(function Spacer({ size }, ref) {
	useImperativeHandle(ref, () => new remote.TouchBar.TouchBarSpacer({ size }), [size]);

	return null;
});
