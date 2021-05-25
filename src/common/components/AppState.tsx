import i18next from 'i18next';
import React, { ReactElement, ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import type { Store } from 'redux';

type AppStateProps = {
  children: ReactNode;
  fallback: ReactElement | null;
  store: Store;
};

const AppState = ({
  children,
  fallback,
  store,
}: AppStateProps): ReactElement => (
  <Provider store={store}>
    <I18nextProvider i18n={i18next}>
      <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>
    </I18nextProvider>
  </Provider>
);

export default AppState;
