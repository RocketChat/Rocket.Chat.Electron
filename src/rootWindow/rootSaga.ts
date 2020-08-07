import { createElement } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Store } from 'redux';
import { call, Effect } from 'redux-saga/effects';

import { App } from '../components/App';
import { whenReady } from '../whenReady';
import { setupErrorHandling } from './errors';
import { setupI18next } from './i18n';


export function *rootSaga(reduxStore: Store): Generator<Effect> {
	yield call(async () => {
		await whenReady();

		setupErrorHandling(reduxStore);

		await setupI18next();

		render(createElement(App, { reduxStore }), document.getElementById('root'));

		window.addEventListener('beforeunload', () => {
			unmountComponentAtNode(document.getElementById('root'));
		});
	});
}
