import { desktopCapturer, remote } from 'electron';
import { t } from 'i18next';
import { useEffect, useRef, useState } from 'react';

import {
	SCREEN_SHARING_DIALOG_DISMISSED,
	SCREEN_SHARING_DIALOG_SOURCE_SELECTED,
} from './actions';

export function ScreenSharingDialog({
	root = document.querySelector('.screen-sharing-dialog'),
	visible = false,
	dispatch,
}) {
	useEffect(() => {
		if (!visible) {
			root.close();
			return;
		}

		root.showModal();

		root.onclose = () => {
			root.close();
			dispatch({ type: SCREEN_SHARING_DIALOG_DISMISSED });
		};

		root.onclick = ({ clientX, clientY }) => {
			const { left, top, width, height } = root.getBoundingClientRect();
			const isInDialog = top <= clientY && clientY <= top + height && left <= clientX && clientX <= left + width;
			if (!isInDialog) {
				root.close();
				dispatch({ type: SCREEN_SHARING_DIALOG_DISMISSED });
			}
		};
	}, [visible]);

	const [sources, setSources] = useState([]);

	useEffect(() => {
		if (!visible) {
			return;
		}

		const fetchSources = async () => {
			const sources = await desktopCapturer.getSources({ types: ['window', 'screen'] });
			setSources(sources);
		};
		fetchSources();
	}, [visible]);

	const sourceSelectedRef = useRef(false);

	useEffect(() => () => {
		const { current: sourceSelected } = sourceSelectedRef;

		if (sourceSelected) {
			return;
		}

		dispatch({ type: SCREEN_SHARING_DIALOG_SOURCE_SELECTED, payload: null });
	}, []);

	const handleScreenSharingSourceClick = (id) => () => {
		sourceSelectedRef.current = true;
		dispatch({ type: SCREEN_SHARING_DIALOG_SOURCE_SELECTED, payload: id });
		dispatch({ type: SCREEN_SHARING_DIALOG_DISMISSED });
	};

	root.querySelector('.screenshare-title').innerText = t('dialog.screenshare.announcement');

	while (root.querySelector('.screen-sharing-sources').firstChild) {
		root.querySelector('.screen-sharing-sources').firstChild.remove();
	}

	root.querySelector('.screen-sharing-sources').append(...sources.map(({ id, name, thumbnail }) => {
		const sourceView = document.importNode(root.querySelector('.screen-sharing-source-template').content, true);

		sourceView.querySelector('.screen-sharing-source').onclick = handleScreenSharingSourceClick(id);

		sourceView.querySelector('.screen-sharing-source-thumbnail img').setAttribute('alt', name);
		sourceView.querySelector('.screen-sharing-source-thumbnail img').setAttribute('src', thumbnail.toDataURL());

		sourceView.querySelector('.screen-sharing-source-name').innerText = name;

		return sourceView;
	}));

	return null;
}
