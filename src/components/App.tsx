import i18n from 'i18next';
import React, { FC } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { Store } from 'redux';

import { MainWindow } from './MainWindow';
import { Shell } from './Shell';
import { ErrorCatcher } from './utils/ErrorCatcher';

type AppProps = {
  reduxStore: Store;
};

export const App: FC<AppProps> = ({ reduxStore }) =>
  <ErrorCatcher>
    <Provider store={reduxStore}>
      <I18nextProvider i18n={i18n}>
        <MainWindow>
          <Shell />
        </MainWindow>
      </I18nextProvider>
    </Provider>
  </ErrorCatcher>;
