import { EditFlags } from 'electron';
import { AnyAction } from 'redux';

import {
	ROOT_WINDOW_EDIT_FLAGS_CHANGED,
	WEBVIEW_EDIT_FLAGS_CHANGED,
} from '../actions';

export const editFlags = (state = {
	canUndo: false,
	canRedo: false,
	canCut: false,
	canCopy: false,
	canPaste: false,
	canSelectAll: false,
	canDelete: false,
}, { type, payload }: AnyAction): EditFlags => {
	switch (type) {
		case ROOT_WINDOW_EDIT_FLAGS_CHANGED:
			return payload;

		case WEBVIEW_EDIT_FLAGS_CHANGED: {
			const { editFlags } = payload;
			return editFlags;
		}
	}

	return state;
};
