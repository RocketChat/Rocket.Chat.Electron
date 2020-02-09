import { remote } from 'electron';
// import { useTranslation } from 'react-i18next';
import React, { useEffect, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
	TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
	// TOUCH_BAR_SELECT_SERVER_TOUCHED,
} from '../../actions';
import { Bar } from './Bar';
import { SegmentedControl } from './SegmentedControl';
import { Spacer } from './Spacer';

// const useSelectServerPanel = (currentServerUrl, servers) => {
// 	const dispatch = useDispatch();
// 	const { t } = useTranslation();

// 	class SelectServerPanel {
// 		constructor() {
// 			this._MAX_LENGTH_FOR_SEGMENTS_CONTROL = 76 - t('touchBar.selectServer').length;
// 			this._hosts = [];

// 			this._setHostsArray();
// 		}

// 		_isSegmentedControl() {
// 			return this.control && this.control.hasOwnProperty('selectedIndex');
// 		}

// 		_getActiveServerIndex() {
// 			return this._hosts.findIndex((value) => value.host === currentServerUrl);
// 		}

// 		_setActiveServer() {
// 			if (this._isSegmentedControl()) {
// 				this.control.selectedIndex = this._getActiveServerIndex();
// 			} else {
// 				this._update();
// 			}
// 		}

// 		_setHostsArray() {
// 			this._hosts = Object.values(servers).map((value) => ({ label: value.title, host: value.url }));
// 			this._hosts = this._trimHostsNames(this._hosts);
// 		}

// 		_getTotalLengthOfHostsNames() {
// 			return this._hosts.reduce((acc, host) => acc + host.label.length, 0);
// 		}

// 		_update() {
// 			this._setHostsArray();
// 			if (this.control) {
// 				if (this._isSegmentedControl()) {
// 					this.control.segments = this._hosts;
// 				} else {
// 					this.control.items = this._hosts;
// 				}
// 			} else {
// 				this.build();
// 			}
// 		}

// 		_buildSelectServersPopoverItems() {
// 			const items = [
// 				new remote.TouchBar.TouchBarLabel({ label: t('touchBar.selectServer') }),
// 			];

// 			// The maximum length of available display area is limited. If exceed the length of displayed data, then
// 			// touchbar element is not displayed. If the length of displayed host names exceeds the limit, then
// 			// the touchBarScrubber is used. In other case SegmentedControl is used.
// 			const hostsNamesLength = this._getTotalLengthOfHostsNames();

// 			if (this._hosts.length) {
// 				if (hostsNamesLength <= this._MAX_LENGTH_FOR_SEGMENTS_CONTROL) {
// 					items.push(this._buildTouchBarSegmentedControl());
// 				} else {
// 					items.push(this._buildTouchBarScrubber());
// 				}
// 			}
// 			return items;
// 		}

// 		_buildTouchBarSegmentedControl() {
// 			this.control = new remote.TouchBar.TouchBarSegmentedControl({
// 				segmentStyle: 'separated',
// 				selectedIndex: this._getActiveServerIndex(),
// 				segments: this._hosts,
// 				change: (index) => {
// 					dispatch({ type: TOUCH_BAR_SELECT_SERVER_TOUCHED, payload: this._hosts[index].host });
// 				},
// 			});
// 			return this.control;
// 		}

// 		_buildTouchBarScrubber() {
// 			this.control = new remote.TouchBar.TouchBarScrubber({
// 				selectedStyle: 'background',
// 				showArrowButtons: true,
// 				mode: 'fixed',
// 				items: this._hosts,
// 				highlight: (index) => {
// 					dispatch({ type: TOUCH_BAR_SELECT_SERVER_TOUCHED, payload: this._hosts[index].host });
// 				},
// 			});
// 			return this.control;
// 		}

// 		/**
// 		 * If it is possible to fit the hosts names to the specific limit, then trim the hosts names to the format "open.rocke.."
// 		 * @param arr {Array} array of hosts
// 		 * @returns {Array} array of hosts
// 		 */
// 		_trimHostsNames(arr) {
// 			const hostsNamesLength = this._getTotalLengthOfHostsNames();

// 			if (hostsNamesLength <= this._MAX_LENGTH_FOR_SEGMENTS_CONTROL) {
// 				return arr;
// 			}

// 			// The total length of hosts names with reserved space for '..' characters
// 			const amountOfCharsToDisplay = this._MAX_LENGTH_FOR_SEGMENTS_CONTROL - 2 * arr.length;
// 			const amountOfCharsPerHost = Math.floor(amountOfCharsToDisplay / arr.length);

// 			if (amountOfCharsPerHost > 0) {
// 				let additionChars = amountOfCharsToDisplay % arr.length;
// 				return arr.map((host) => {
// 					if (amountOfCharsPerHost < host.label.length) {
// 						let additionChar = 0;
// 						if (additionChars) {
// 							additionChar = 1;
// 							additionChars--;
// 						}
// 						host.label = `${ host.label.slice(0, amountOfCharsPerHost + additionChar) }..`;
// 					}
// 					return host;
// 				});
// 			}
// 			return arr;
// 		}

// 		build() {
// 			const popoverItems = this._buildSelectServersPopoverItems();

// 			this.touchBarPopover = new remote.TouchBar.TouchBarPopover({
// 				label: t('touchBar.selectServer'),
// 				items: new remote.TouchBar({
// 					items: popoverItems,
// 				}),
// 			});
// 			return this.touchBarPopover;
// 		}
// 	}

// 	return new SelectServerPanel().build();
// };

export function TouchBar() {
	// const servers = useSelector(({ servers }) => servers);
	const currentServerUrl = useSelector(({ currentServerUrl }) => currentServerUrl);

	// const selectServerPanel = useSelectServerPanel(currentServerUrl, servers);
	// const formattingPanel = useFormattingPanel(!!currentServerUrl);

	// useEffect(() => {
	// 	const touchBar = new remote.TouchBar({
	// 		items: [
	// 			selectServerPanel,
	// 			...formattingPanel,
	// 		],
	// 	});
	// 	remote.getCurrentWindow().setTouchBar(touchBar);
	// });

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

	return <Bar ref={barRef}>
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
