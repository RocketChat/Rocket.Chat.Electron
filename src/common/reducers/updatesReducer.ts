import { createReducer } from '@reduxjs/toolkit';

import type { ActionOf } from '../actions';
import { ABOUT_DIALOG_TOGGLE_UPDATE_ON_START } from '../actions/uiActions';
import * as updateActions from '../actions/updateActions';
import * as updateCheckActions from '../actions/updateCheckActions';

type State = {
  allowed: boolean;
  settings: {
    editable: boolean;
    enabled: boolean;
    checkOnStartup: boolean;
    skippedVersion: string | null;
  };
  latest?:
    | {
        status: 'pending';
      }
    | {
        status: 'fulfilled';
        version: string | null;
      }
    | {
        status: 'rejected';
        error: Error;
      };
};

export const updatesReducer = createReducer<State>(
  {
    allowed: true,
    settings: {
      editable: true,
      enabled: true,
      checkOnStartup: true,
      skippedVersion: null,
    },
  },
  (builder) =>
    builder
      .addCase(
        ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
        (
          state,
          action: ActionOf<typeof ABOUT_DIALOG_TOGGLE_UPDATE_ON_START>
        ) => {
          state.settings.checkOnStartup = action.payload;
        }
      )
      .addCase(updateCheckActions.started, (state) => {
        state.latest = {
          status: 'pending',
        };
      })
      .addCase(updateCheckActions.failed, (state, action) => {
        state.latest = {
          status: 'rejected',
          error: action.payload,
        };
      })
      .addCase(updateCheckActions.upToDate, (state) => {
        state.latest = {
          status: 'fulfilled',
          version: null,
        };
      })
      .addCase(updateCheckActions.newVersionAvailable, (state, action) => {
        state.latest = {
          status: 'fulfilled',
          version: action.payload,
        };
      })
      .addCase(updateActions.skipped, (state, action) => {
        state.settings.skippedVersion = action.payload;
      })
      .addCase(updateActions.failed, (state, action) => {
        state.latest = {
          status: 'rejected',
          error: action.payload,
        };
      })
);
