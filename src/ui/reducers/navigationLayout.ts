import type { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../../app/actions';
import type { ActionOf } from '../../store/actions';
import {
  MENU_BAR_SET_NAVIGATION_LAYOUT_CLICKED,
  SETTINGS_SET_NAVIGATION_LAYOUT_CHANGED,
} from '../actions';
import type { NavigationLayout } from '../common';

type NavigationLayoutAction =
  | ActionOf<typeof MENU_BAR_SET_NAVIGATION_LAYOUT_CLICKED>
  | ActionOf<typeof SETTINGS_SET_NAVIGATION_LAYOUT_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export const navigationLayout: Reducer<
  NavigationLayout,
  NavigationLayoutAction
> = (state = 'tabs', action) => {
  switch (action.type) {
    case SETTINGS_SET_NAVIGATION_LAYOUT_CHANGED:
    case MENU_BAR_SET_NAVIGATION_LAYOUT_CLICKED:
      return action.payload;

    case APP_SETTINGS_LOADED: {
      const { navigationLayout = state } = action.payload;
      return navigationLayout;
    }

    default:
      return state;
  }
};
