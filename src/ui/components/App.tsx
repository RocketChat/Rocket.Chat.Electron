import i18n from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import type { Store } from 'redux';

import { Shell } from './Shell';
import { ErrorCatcher } from './utils/ErrorCatcher';

type AppProps = {
  reduxStore: Store;
};

export const App = ({ reduxStore }: AppProps) => (
  <ErrorCatcher>
    <Provider store={reduxStore}>
      <I18nextProvider i18n={i18n}>
        <Shell />
      </I18nextProvider>
    </Provider>
  </ErrorCatcher>
);
