import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';

type IsContextMenuEnabledOverrideAction = ActionOf<typeof APP_SETTINGS_LOADED>;

// Admin value from overridden-settings.json; null when no admin set it.
export const isContextMenuEnabledOverride: Reducer<
  boolean | null,
  IsContextMenuEnabledOverrideAction
> = (state = null, action) => {
  switch (action.type) {
    case APP_SETTINGS_LOADED: {
      const { isContextMenuEnabledOverride = state } = action.payload;
      return isContextMenuEnabledOverride ?? null;
    }

    default:
      return state;
  }
};
