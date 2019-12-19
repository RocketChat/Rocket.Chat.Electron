import { remote } from 'electron';
import { t } from 'i18next';

import { createElement, useEffect } from './reactiveUi';

const { TouchBar: ElectronTouchBar, nativeImage } = remote;
const { TouchBarButton, TouchBarLabel, TouchBarSegmentedControl, TouchBarScrubber, TouchBarPopover, TouchBarGroup } = ElectronTouchBar;

const useSelectServerPanel = (activeServerUrl, servers, onChangeServer) => {
	class SelectServerPanel {
		constructor() {
			this._MAX_LENGTH_FOR_SEGMENTS_CONTROL = 76 - t('touchBar.selectServer').length;
			this._hosts = [];

			this._setHostsArray();
		}

		_isSegmentedControl() {
			return this.control && this.control.hasOwnProperty('selectedIndex');
		}

		_getActiveServerIndex() {
			return this._hosts.findIndex((value) => value.host === activeServerUrl);
		}

		_setActiveServer() {
			if (this._isSegmentedControl()) {
				this.control.selectedIndex = this._getActiveServerIndex();
			} else {
				this._update();
			}
		}

		_setHostsArray() {
			this._hosts = Object.values(servers).map((value) => ({ label: value.title, host: value.url }));
			this._hosts = this._trimHostsNames(this._hosts);
		}

		_getTotalLengthOfHostsNames() {
			return this._hosts.reduce((acc, host) => acc + host.label.length, 0);
		}

		_update() {
			this._setHostsArray();
			if (this.control) {
				if (this._isSegmentedControl()) {
					this.control.segments = this._hosts;
				} else {
					this.control.items = this._hosts;
				}
			} else {
				this.build();
			}
		}

		build() {
			const popoverItems = this._buildSelectServersPopoverItems();

			this.touchBarPopover = new TouchBarPopover({
				label: t('touchBar.selectServer'),
				items: new ElectronTouchBar({
					items: popoverItems,
				}),
			});
			return this.touchBarPopover;
		}

		_buildSelectServersPopoverItems() {
			const items = [
				new TouchBarLabel({ label: t('touchBar.selectServer') }),
			];

			// The maximum length of available display area is limited. If exceed the length of displayed data, then
			// touchbar element is not displayed. If the length of displayed host names exceeds the limit, then
			// the touchBarScrubber is used. In other case SegmentedControl is used.
			const hostsNamesLength = this._getTotalLengthOfHostsNames();

			if (this._hosts.length) {
				if (hostsNamesLength <= this._MAX_LENGTH_FOR_SEGMENTS_CONTROL) {
					items.push(this._buildTouchBarSegmentedControl());
				} else {
					items.push(this._buildTouchBarScrubber());
				}
			}
			return items;
		}

		_buildTouchBarSegmentedControl() {
			this.control = new TouchBarSegmentedControl({
				segmentStyle: 'separated',
				selectedIndex: this._getActiveServerIndex(),
				segments: this._hosts,
				change: (index) => {
					onChangeServer(this._hosts[index].host);
				},
			});
			return this.control;
		}

		_buildTouchBarScrubber() {
			this.control = new TouchBarScrubber({
				selectedStyle: 'background',
				showArrowButtons: true,
				mode: 'fixed',
				items: this._hosts,
				highlight: (index) => {
					onChangeServer(this._hosts[index].host);
				},
			});
			return this.control;
		}

		/**
		 * If it is possible to fit the hosts names to the specific limit, then trim the hosts names to the format "open.rocke.."
		 * @param arr {Array} array of hosts
		 * @returns {Array} array of hosts
		 */
		_trimHostsNames(arr) {
			const hostsNamesLength = this._getTotalLengthOfHostsNames();

			if (hostsNamesLength <= this._MAX_LENGTH_FOR_SEGMENTS_CONTROL) {
				return arr;
			}

			// The total length of hosts names with reserved space for '..' characters
			const amountOfCharsToDisplay = this._MAX_LENGTH_FOR_SEGMENTS_CONTROL - 2 * arr.length;
			const amountOfCharsPerHost = Math.floor(amountOfCharsToDisplay / arr.length);

			if (amountOfCharsPerHost > 0) {
				let additionChars = amountOfCharsToDisplay % arr.length;
				return arr.map((host) => {
					if (amountOfCharsPerHost < host.label.length) {
						let additionChar = 0;
						if (additionChars) {
							additionChar = 1;
							additionChars--;
						}
						host.label = `${ host.label.slice(0, amountOfCharsPerHost + additionChar) }..`;
					}
					return host;
				});
			}
			return arr;
		}
	}

	return new SelectServerPanel().build();
};

const useFormattingPanel = (activeWebView) => {
	if (!activeWebView || !activeWebView.classList.contains('ready')) {
		return new TouchBarGroup({ items: [] });
	}

	const ids = ['bold', 'italic', 'strike', 'inline_code', 'multi_line'];

	const formatButtons = ids.map((id) => new TouchBarButton({
		icon: nativeImage.createFromPath(`${ __dirname }/images/touch-bar/${ id }.png`),
		click: () => {
			activeWebView.executeJavaScript(`(() => {
				const button = document.querySelector('.rc-message-box .js-format[data-id="${ id }"]');
				button.click();
			})()`.trim());
		},
	}));

	return new TouchBarGroup({
		items: new ElectronTouchBar({
			items: [
				new TouchBarLabel({ label: t('touchBar.formatting') }),
				...formatButtons,
			],
		}),
	});
};

function TouchBar({ activeWebView, activeServerUrl, servers = [], onChangeServer }) {
	const selectServerPanel = useSelectServerPanel(activeServerUrl, servers, onChangeServer);
	const formattingPanel = useFormattingPanel(activeWebView);

	useEffect(() => {
		const touchBar = new ElectronTouchBar({
			items: [
				selectServerPanel,
				formattingPanel,
			],
		});
		remote.getCurrentWindow().setTouchBar(touchBar);
	});

	return null;
}

let touchBarElement;

export const mountTouchBar = (props) => {
	touchBarElement = createElement(TouchBar, props);
	touchBarElement.mount(document.body);
};

export const updateTouchBar = (newProps) => {
	touchBarElement.update(newProps);
};
