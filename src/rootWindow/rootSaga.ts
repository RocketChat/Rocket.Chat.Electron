import { createElement } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Store } from 'redux';
import { call, Effect } from 'redux-saga/effects';

import { takeRequests } from '../channels';
import { App } from '../components/App';
import { whenReady } from '../whenReady';
import { attachErrorHandling } from './errors';
import { setupI18next } from './i18n';

export function *rootSaga(reduxStore: Store): Generator<Effect> {
	yield *takeRequests();

	yield call(whenReady);

	yield *attachErrorHandling();
	yield call(setupI18next);

	yield call(() => {
		const container = document.getElementById('root');

		render(createElement(App, { reduxStore }), container);

		window.addEventListener('beforeunload', () => {
			unmountComponentAtNode(container);
		});
	});
}
