import type { AnyAction } from 'redux';

import { rootReducer } from './reducers';
import type { RootState } from './types/RootState';

export const getInitialState = (): RootState =>
  rootReducer(undefined, { type: '@@INIT' } as AnyAction);
