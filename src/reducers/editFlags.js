import {
	MAIN_WINDOW_EDIT_FLAGS_CHANGED,
	WEBVIEW_EDIT_FLAGS_CHANGED,
} from '../actions';

export const editFlags = (state = {
	canUndo: false,
	canRedo: false,
	canCut: false,
	canCopy: false,
	canPaste: false,
	canSelectAll: false,
}, { type, payload }) => {
	switch (type) {
		case MAIN_WINDOW_EDIT_FLAGS_CHANGED:
			return payload;

		case WEBVIEW_EDIT_FLAGS_CHANGED: {
			const { editFlags } = payload;
			return editFlags;
		}
	}

	return state;
};
