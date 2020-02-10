import { remote } from 'electron';
import mem from 'mem';
import React, { forwardRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { TouchBarPopover } from '../electron/TouchBarPopover';
import { TouchBarBar } from '../electron/TouchBarBar';
import { TouchBarScrubber } from '../electron/TouchBarScrubber';
import { TOUCH_BAR_SELECT_SERVER_TOUCHED } from '../../actions';

const getNativeImageFromDataURL = mem((dataURL) => (dataURL ? remote.nativeImage.createFromDataURL(dataURL) : null));

export const ServerSelectionPopover = forwardRef(function ServerSelectionPopover(_, ref) {
	const servers = useSelector(({ servers }) => servers);
	const currentServer = useSelector(({ servers, currentServerUrl }) => servers.find(({ url }) => url === currentServerUrl));
	const { t } = useTranslation();
	const dispatch = useDispatch();

	return <TouchBarPopover
		ref={ref}
		label={currentServer ? currentServer.title : t('touchBar.selectServer')}
		icon={currentServer ? getNativeImageFromDataURL(currentServer.favicon) : null}
	>
		<TouchBarBar>
			<TouchBarScrubber
				selectedStyle='background'
				mode='free'
				continuous={false}
				items={servers.map((server) => ({
					label: server.title.padEnd(30),
					icon: getNativeImageFromDataURL(server.favicon),
				}))}
				onSelect={(index) => {
					dispatch({ type: TOUCH_BAR_SELECT_SERVER_TOUCHED, payload: servers[index].url });
				}}
			/>
		</TouchBarBar>
	</TouchBarPopover>;
});
