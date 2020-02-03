import { desktopCapturer } from 'electron';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import {
	SCREEN_SHARING_DIALOG_DISMISSED,
	SCREEN_SHARING_DIALOG_SOURCE_SELECTED,
} from '../actions';

export function ScreenSharingDialog({
	visible = false,
}) {
	const rootRef = useRef();
	const dispatch = useDispatch();

	useEffect(() => {
		const root = rootRef.current;

		if (!visible) {
			root.close();
			return;
		}

		root.showModal();

		root.onclose = () => {
			root.close();
			dispatch({ type: SCREEN_SHARING_DIALOG_DISMISSED });
			dispatch({ type: SCREEN_SHARING_DIALOG_SOURCE_SELECTED, payload: null });
		};

		root.onclick = ({ clientX, clientY }) => {
			const { left, top, width, height } = root.getBoundingClientRect();
			const isInDialog = top <= clientY && clientY <= top + height && left <= clientX && clientX <= left + width;
			if (!isInDialog) {
				root.close();
				dispatch({ type: SCREEN_SHARING_DIALOG_DISMISSED });
				dispatch({ type: SCREEN_SHARING_DIALOG_SOURCE_SELECTED, payload: null });
			}
		};
	}, [rootRef, visible, dispatch]);

	const { t } = useTranslation();

	const [sources, setSources] = useState([]);

	useEffect(() => {
		if (!visible) {
			return;
		}

		const fetchSources = async () => {
			const sources = await desktopCapturer.getSources({ types: ['window', 'screen'] });
			setSources(sources);
		};

		const timer = setInterval(() => {
			fetchSources();
		}, 1000);

		return () => {
			clearInterval(timer);
		};
	}, [visible]);

	const handleScreenSharingSourceClick = (id) => () => {
		dispatch({ type: SCREEN_SHARING_DIALOG_SOURCE_SELECTED, payload: id });
	};

	return <dialog ref={rootRef} className='screen-sharing-dialog'>
		<h1 className='screenshare-title'>{t('dialog.screenshare.announcement')}</h1>
		<div className='screen-sharing-sources'>
			{sources.map(({ id, name, thumbnail }) => <div key={id} className='screen-sharing-source' onClick={handleScreenSharingSourceClick(id)}>
				<div className='screen-sharing-source-thumbnail'>
					<img src={thumbnail.toDataURL()} alt={name} />
				</div>
				<div className='screen-sharing-source-name'>{name}</div>
			</div>)}
		</div>
	</dialog>;
}
