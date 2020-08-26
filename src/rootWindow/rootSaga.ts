import { createElement } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { call, Effect } from 'redux-saga/effects';

import { takeRequests } from '../channels';
import { App } from '../components/App';
import { getReduxStore } from '../store';
import { whenReady } from '../whenReady';
import { attachErrorHandling } from './errors';
import { setupI18next } from './i18n';

export function *rootSaga(): Generator<Effect> {
  yield *takeRequests();

  yield call(whenReady);

  yield *attachErrorHandling();
  yield call(setupI18next);

  yield call(() => {
    const container = document.getElementById('root');

    const reduxStore = getReduxStore();

    render(createElement(App, { reduxStore }), container);

    window.addEventListener('beforeunload', () => {
      unmountComponentAtNode(container);
    });
  });
}
