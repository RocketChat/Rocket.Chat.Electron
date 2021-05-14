import { createReducer } from '@reduxjs/toolkit';

type State = {
  readonly name: string;
  readonly version: string;
  readonly path: string;
  readonly platform: NodeJS.Platform;
  readonly locale: string;
};

export const appReducer = createReducer<State>(
  {
    name: '',
    version: '',
    path: '',
    platform: 'linux',
    locale: 'en-US',
  },
  (builder) => builder
);
