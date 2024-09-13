import type { Reducer } from 'redux';

import type { ActionOf } from '../../store/actions';
import { APP_MACHINE_THEME_SET } from '../actions';

type MachineThemeAction = ActionOf<typeof APP_MACHINE_THEME_SET>;

export const machineTheme: Reducer<string | null, MachineThemeAction> = (
  state = 'light',
  action
) => {
  switch (action.type) {
    case APP_MACHINE_THEME_SET: {
      return action.payload;
    }

    default:
      return state;
  }
};
