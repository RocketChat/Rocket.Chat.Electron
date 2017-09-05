import store from '../utils/store';

export const TOGGLE_SIDEBAR = 'TOGGLE_SIDEBAR';

export function toggleSidebar(visible) {
  return {
    type: TOGGLE_SIDEBAR,
    visible
  };
}
