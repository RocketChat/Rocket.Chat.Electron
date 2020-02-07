import { desktopCapturer } from 'electron';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import {
	SCREEN_SHARING_DIALOG_DISMISSED,
	SCREEN_SHARING_DIALOG_SOURCE_SELECTED,
} from '../actions';
import { useDialog } from '../hooks/useDialog';

export function ScreenSharingDialog({
	visible = false,
}) {
	const dispatch = useDispatch();

	const dialogRef = useDialog(visible, () => {
		dispatch({ type: SCREEN_SHARING_DIALOG_DISMISSED });
		dispatch({ type: SCREEN_SHARING_DIALOG_SOURCE_SELECTED, payload: null });
	});

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

	return <dialog ref={dialogRef} className='screen-sharing-dialog'>
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
