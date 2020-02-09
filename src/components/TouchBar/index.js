import { remote } from 'electron';
import mem from 'mem';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
	TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
	TOUCH_BAR_SELECT_SERVER_TOUCHED,
} from '../../actions';
import { Bar } from './Bar';
import { SegmentedControl } from './SegmentedControl';
import { Spacer } from './Spacer';
import { Popover } from './Popover';
import { Scrubber } from './Scrubber';

const getNativeImageFromPath = mem((path) => remote.nativeImage.createFromPath(path));
const getNativeImageFromDataURL = mem((dataURL) => (dataURL ? remote.nativeImage.createFromDataURL(dataURL) : null));

export function TouchBar() {
	const isMessageBoxFocused = useSelector(({ isMessageBoxFocused }) => isMessageBoxFocused);
	const servers = useSelector(({ servers }) => servers);
	const currentServer = useSelector(({ servers, currentServerUrl }) => servers.find(({ url }) => url === currentServerUrl));

	const barRef = useRef();
	const prevBarRef = useRef();
	useEffect(() => {
		if (prevBarRef.current === barRef.current) {
			return;
		}

		remote.getCurrentWindow().setTouchBar(barRef.current);
		prevBarRef.current = barRef.current;
	});

	const ids = useMemo(() => ['bold', 'italic', 'strike', 'inline_code', 'multi_line'], []);
	const dispatch = useDispatch();
	const { t } = useTranslation();

	return <Bar ref={barRef}>
		<Popover
			label={currentServer ? currentServer.title : t('touchBar.selectServer')}
			icon={currentServer ? getNativeImageFromDataURL(currentServer.favicon) : null}
		>
			<Bar>
				<Scrubber
					selectedStyle='background'
					mode='free'
					continuous={false}
					items={servers.map((server) => ({
						label: server.title.padEnd(30),
						// icon: server.favicon && remote.nativeImage.createFromDataURL(server.favicon),
					}))}
					onSelect={(index) => {
						dispatch({ type: TOUCH_BAR_SELECT_SERVER_TOUCHED, payload: servers[index].url });
					}}
				/>
			</Bar>
		</Popover>
		<Spacer size='flexible' />
		<SegmentedControl
			mode='buttons'
			segments={useMemo(() => ids.map((id) => ({
				icon: getNativeImageFromPath(`${ remote.app.getAppPath() }/app/public/images/touch-bar/${ id }.png`),
				enabled: isMessageBoxFocused,
			})), [ids, isMessageBoxFocused])}
			onChange={(selectedIndex) => dispatch({ type: TOUCH_BAR_FORMAT_BUTTON_TOUCHED, payload: ids[selectedIndex] })}
		/>
		<Spacer size='flexible' />
	</Bar>;
}
