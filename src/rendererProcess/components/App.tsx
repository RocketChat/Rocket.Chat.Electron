import i18n from 'i18next';
import React, { FC } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import type { Store } from 'redux';

import { Shell } from './Shell';

type AppProps = {
  reduxStore: Store;
};

export const App: FC<AppProps> = ({ reduxStore }) => (
  <Provider store={reduxStore}>
    <I18nextProvider i18n={i18n}>
      <ErrorBoundary fallback={null}>
        <Shell />
      </ErrorBoundary>
    </I18nextProvider>
  </Provider>
);
