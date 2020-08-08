import path from 'path';

import { app } from 'electron';
import i18next from 'i18next';
import i18nextNodeFileSystemBackend from 'i18next-node-fs-backend';
import { takeEvery, call, put, Effect } from 'redux-saga/effects';

import {
	I18N_PARAMS_REQUESTED,
	I18N_PARAMS_RESPONDED,
} from '../actions';
import { RequestAction } from '../channels';

const defaultLocale = 'en';

const normalizeLocale = (locale: string): string => {
	let [languageCode, countryCode] = locale.split ? locale.split(/[-_]/) : [];
	if (!languageCode || languageCode.length !== 2) {
		return defaultLocale;
	}

	languageCode = languageCode.toLowerCase();

	if (!countryCode || countryCode.length !== 2) {
		countryCode = null;
	} else {
		countryCode = countryCode.toUpperCase();
	}

	return countryCode ? `${ languageCode }-${ countryCode }` : languageCode;
};

export const setupI18n = async (): Promise<void> => {
	await i18next
		.use(i18nextNodeFileSystemBackend)
		.init({
			lng: normalizeLocale(app.getLocale()),
			fallbackLng: defaultLocale,
			backend: {
				loadPath: path.join(app.getAppPath(), 'app/i18n/{{lng}}.i18n.json'),
			},
			interpolation: {
				format: (value, _format, lng) => {
					if (value instanceof Date && !Number.isNaN(value.getTime())) {
						return new Intl.DateTimeFormat(lng).format(value);
					}

					return String(value);
				},
			},
			initImmediate: true,
		});
};

export function *takeI18nActions(): Generator<Effect> {
	yield takeEvery(I18N_PARAMS_REQUESTED, function *(action: RequestAction<void>) {
		const { meta: { id } } = action;
		const params = yield call(() => ({
			lng: i18next.language,
			fallbackLng: defaultLocale,
			resources: {
				[i18next.language]: {
					translation: i18next.getResourceBundle(i18next.language, 'translation'),
				},
				[defaultLocale]: {
					translation: i18next.getResourceBundle(defaultLocale, 'translation'),
				},
			},
		}));
		const responseAction = {
			type: I18N_PARAMS_RESPONDED,
			payload: params,
			meta: {
				response: true,
				id,
			},
		};
		yield put(responseAction);
	});
}
