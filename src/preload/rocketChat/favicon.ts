import { eventChannel, EventChannel } from 'redux-saga';
import { Effect, call, takeEvery, put, CallEffect } from 'redux-saga/effects';

import { WEBVIEW_FAVICON_CHANGED } from '../../actions';
import { getServerUrl } from './getServerUrl';

const FAVICON_SIZE = 100;

const createFaviconUpdatesChannel = (): CallEffect<EventChannel<string>> =>
	call(() => eventChannel<string>((emit) => {
		const canvas = document.createElement('canvas');
		canvas.width = FAVICON_SIZE;
		canvas.height = FAVICON_SIZE;

		const ctx = canvas.getContext('2d');

		const image = new Image();

		const { Meteor } = window.require('meteor/meteor');
		const { Tracker } = window.require('meteor/tracker');
		const { settings } = window.require('/app/settings');

		const computation = Tracker.autorun(() => {
			const { url, defaultUrl } = settings.get('Assets_favicon') || {};
			const faviconUrl = url || defaultUrl;

			if (typeof faviconUrl !== 'string') {
				return;
			}

			image.src = Meteor.absoluteUrl(faviconUrl);
		});

		const handle = (): void => {
			ctx.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);
			ctx.drawImage(image, 0, 0, FAVICON_SIZE, FAVICON_SIZE);
			emit(canvas.toDataURL());
		};

		image.addEventListener('load', handle, { passive: true });

		return () => {
			computation.stop();
			image.removeEventListener('load', handle);
		};
	}));

export function *listenToFaviconChanges(): Generator<Effect, void> {
	const faviconUpdates = (yield createFaviconUpdatesChannel()) as EventChannel<string>;

	yield takeEvery(faviconUpdates, function *(favicon) {
		yield put({
			type: WEBVIEW_FAVICON_CHANGED,
			payload: {
				url: yield call(getServerUrl),
				favicon,
			},
		});
	});
}
