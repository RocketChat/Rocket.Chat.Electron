import React, { ReactElement } from 'react';
import type { Store } from 'redux';

import AppState from '../../common/components/AppState';
import App from './App';

type AppRootProps = {
  store: Store;
};

const AppRoot = ({ store }: AppRootProps): ReactElement => (
  <AppState store={store} fallback={null}>
    <App />
  </AppState>
);

export default AppRoot;
