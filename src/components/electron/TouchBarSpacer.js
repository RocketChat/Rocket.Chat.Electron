import { remote } from 'electron';
import { forwardRef, useImperativeHandle } from 'react';

export const TouchBarSpacer = forwardRef(function TouchBarSpacer({ size }, ref) {
	useImperativeHandle(ref, () => new remote.TouchBar.TouchBarSpacer({ size }), [size]);

	return null;
});
