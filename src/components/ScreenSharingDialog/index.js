import { desktopCapturer } from 'electron';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import {
	SCREEN_SHARING_DIALOG_DISMISSED,
	SCREEN_SHARING_DIALOG_SOURCE_SELECTED,
} from '../../actions';
import { useDialog } from '../../hooks/useDialog';
import { Wrapper, Announcement, Sources, Source, ThumbnailWrapper, Thumbnail, Name } from './styles';

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

	return <Wrapper ref={dialogRef}>
		<Announcement>{t('dialog.screenshare.announcement')}</Announcement>
		<Sources>
			{sources.map(({ id, name, thumbnail }) => <Source key={id} onClick={handleScreenSharingSourceClick(id)}>
				<ThumbnailWrapper>
					<Thumbnail src={thumbnail.toDataURL()} alt={name} />
				</ThumbnailWrapper>
				<Name>{name}</Name>
			</Source>)}
		</Sources>
	</Wrapper>;
}
