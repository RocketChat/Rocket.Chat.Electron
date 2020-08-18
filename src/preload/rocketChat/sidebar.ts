import { eventChannel, EventChannel } from 'redux-saga';
import { Effect, call, takeEvery, put, CallEffect } from 'redux-saga/effects';

import { WEBVIEW_SIDEBAR_STYLE_CHANGED } from '../../actions';
import { selectChanges } from '../../selectChanges';
import { selectIsSideBarVisible } from '../../selectors';
import { getServerUrl } from './getServerUrl';

function *handleTrafficLightsSpacing(): Generator<Effect, void> {
	const style = (yield call(() => {
		const style = document.getElementById('sidebar-padding') || document.createElement('style');
		style.id = 'sidebar-padding';
		document.head.append(style);
		return style;
	})) as HTMLStyleElement;

	yield selectChanges(selectIsSideBarVisible, function *(isSideBarVisible) {
		console.log(isSideBarVisible);
		if (isSideBarVisible) {
			yield call(() => {
				style.innerHTML = `
					.sidebar {
						padding-top: 0 !important;
						transition: padding-top 230ms ease-in-out !important;
					}
				`;
			});
		} else {
			yield call(() => {
				style.innerHTML = `
					.sidebar {
						padding-top: 10px !important;
						transition: padding-top 230ms ease-in-out !important;
					}
				`;
			});
		}
	});
}

let timer: ReturnType<typeof setTimeout>;
let prevBackground: string;
let prevColor: string;

type SideBarStyle = {
	background: string;
	color: string;
};

const pollSidebarStyle = (referenceElement: Element, emit: (input: SideBarStyle) => void): void => {
	clearTimeout(timer);

	document.body.append(referenceElement);
	const {
		background,
		color,
	} = window.getComputedStyle(referenceElement);
	referenceElement.remove();

	if (prevBackground !== background || prevColor !== color) {
		emit({
			background,
			color,
		});
		prevBackground = background;
		prevColor = color;
	}

	timer = setTimeout(() => pollSidebarStyle(referenceElement, emit), 1000);
};

const createSideBarStyleUpdatesChannel = (): CallEffect<EventChannel<SideBarStyle>> =>
	call(() => eventChannel<SideBarStyle>((emit) => {
		const referenceElement = document.createElement('div');
		referenceElement.classList.add('sidebar');
		referenceElement.style.backgroundColor = 'var(--sidebar-background)';
		referenceElement.style.color = 'var(--sidebar-item-text-color)';
		referenceElement.style.display = 'none';

		const { Meteor } = window.require('meteor/meteor');
		const { Tracker } = window.require('meteor/tracker');
		const { settings } = window.require('/app/settings');

		const computation = Tracker.autorun(() => {
			const { url, defaultUrl } = settings.get('Assets_background') || {};
			const backgroundUrl = url || defaultUrl;

			if (backgroundUrl) {
				referenceElement.style.backgroundImage = `url(${ JSON.stringify(Meteor.absoluteUrl(backgroundUrl)) })`;
			} else {
				referenceElement.style.backgroundImage = null;
			}

			pollSidebarStyle(referenceElement, emit);
		});

		return () => {
			computation.stop();
		};
	}));

export function *listenToSideBarChanges(): Generator<Effect, void> {
	if (process.platform === 'darwin') {
		yield *handleTrafficLightsSpacing();
	}

	const sideBarStyleUpdates = (yield createSideBarStyleUpdatesChannel()) as EventChannel<SideBarStyle>;

	yield takeEvery(sideBarStyleUpdates, function *(sideBarStyle) {
		yield put({
			type: WEBVIEW_SIDEBAR_STYLE_CHANGED,
			payload: {
				url: yield call(getServerUrl),
				style: sideBarStyle,
			},
		});
	});
}
