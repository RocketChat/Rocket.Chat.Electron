import { getServerUrl } from '.';
import { WEBVIEW_SIDEBAR_STYLE_CHANGED } from '../../actions';
import { dispatch } from '../../channels';
import { selectIsSideBarVisible } from '../../selectors';

let timer;
let prevBackground;
let prevColor;

const pollSidebarStyle = (referenceElement) => {
	clearTimeout(timer);

	document.body.append(referenceElement);
	const {
		background,
		color,
	} = window.getComputedStyle(referenceElement);
	referenceElement.remove();

	if (prevBackground !== background || prevColor !== color) {
		dispatch({
			type: WEBVIEW_SIDEBAR_STYLE_CHANGED,
			payload: {
				url: getServerUrl(),
				style: {
					background,
					color,
				},
			},
		});
		prevBackground = background;
		prevColor = color;
	}

	timer = setTimeout(() => pollSidebarStyle(referenceElement), 1000);
};

export const setupSidebarChanges = (reduxStore) => {
	const referenceElement = document.createElement('div');
	referenceElement.classList.add('sidebar');
	referenceElement.style.backgroundColor = 'var(--sidebar-background)';
	referenceElement.style.color = 'var(--sidebar-item-text-color)';
	referenceElement.style.display = 'none';

	const { Meteor } = window.require('meteor/meteor');
	const { Tracker } = window.require('meteor/tracker');
	const { settings } = window.require('/app/settings');

	Tracker.autorun(() => {
		const { url, defaultUrl } = settings.get('Assets_background') || {};
		const backgroundUrl = url || defaultUrl;

		if (backgroundUrl) {
			referenceElement.style.backgroundImage = `url(${ JSON.stringify(Meteor.absoluteUrl(backgroundUrl)) })`;
		} else {
			referenceElement.style.backgroundImage = null;
		}

		pollSidebarStyle(referenceElement);
	});

	const style = document.getElementById('sidebar-padding') || document.createElement('style');
	style.id = 'sidebar-padding';
	document.head.append(style);

	let prevIsSideBarVisible;
	reduxStore.subscribe(() => {
		const isSideBarVisible = selectIsSideBarVisible(reduxStore.getState());
		if (prevIsSideBarVisible !== isSideBarVisible) {
			if (process.platform !== 'darwin') {
				return;
			}

			if (isSideBarVisible) {
				style.innerHTML = `
					.sidebar {
						padding-top: 0 !important;
						transition: padding-top 230ms ease-in-out !important;
					}
				`;
			} else {
				style.innerHTML = `
					.sidebar {
						padding-top: 10px !important;
						transition: padding-top 230ms ease-in-out !important;
					}
				`;
			}

			prevIsSideBarVisible = isSideBarVisible;
		}
	});
};
