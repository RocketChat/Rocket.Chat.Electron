import React, { ReactElement } from 'react';
import type { Store } from 'redux';

import AppState from '../../common/components/AppState';
import { Shell } from './Shell';

type AppRootProps = {
  store: Store;
};

const AppRoot = ({ store }: AppRootProps): ReactElement => (
  <AppState fallback={null} store={store}>
    <Shell />
  </AppState>
);

export default AppRoot;
