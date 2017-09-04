// @flow
import { TOGGLE_SIDEBAR } from '../actions/sidebar';

export function sidebarStatus(state = true, action) {
  switch (action.type) {
    case TOGGLE_SIDEBAR:
      return action.visible;
    default:
      return state;
  }
}
