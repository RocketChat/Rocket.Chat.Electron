import type { AnyAction } from 'redux';

import { rootReducer, RootState } from './reducers';

export const getInitialState = (): RootState =>
  rootReducer(undefined, { type: '@@INIT' } as AnyAction);
