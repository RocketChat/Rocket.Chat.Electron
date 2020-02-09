import { remote } from 'electron';
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

export function TouchBar() {
	const servers = useSelector(({ servers }) => servers);
	const currentServerUrl = useSelector(({ currentServerUrl }) => currentServerUrl);
	const currentServer = useMemo(() => servers.find(({ url }) => url === currentServerUrl), [currentServerUrl, servers]);

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
	const icons = useMemo(() => ids.map((id) => remote.nativeImage.createFromPath(`${ remote.app.getAppPath() }/app/public/images/touch-bar/${ id }.png`)), [ids]);
	const dispatch = useDispatch();
	const { t } = useTranslation();

	return <Bar ref={barRef}>
		<Popover label={currentServer ? currentServer.title : t('touchBar.selectServer')}>
			<Bar>
				<Scrubber
					selectedStyle='outline'
					mode='free'
					items={servers.map((server) => ({ label: server.title.padEnd(30) }))}
					onSelect={(index) => {
						dispatch({ type: TOUCH_BAR_SELECT_SERVER_TOUCHED, payload: servers[index].url });
					}}
				/>
			</Bar>
		</Popover>
		<Spacer size='flexible' />
		<SegmentedControl
			mode='buttons'
			segments={icons.map((icon) => ({
				icon,
				enabled: !!currentServerUrl,
			}))}
			onChange={(selectedIndex) => dispatch({ type: TOUCH_BAR_FORMAT_BUTTON_TOUCHED, payload: ids[selectedIndex] })}
		/>
		<Spacer size='flexible' />
	</Bar>;
}
