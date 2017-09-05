// @flow
import { UPDATE_AVAILABLE, UPDATE_PROGRESS } from '../actions/update';

export default function update(state = null, action) {
  switch (action.type) {
    case UPDATE_AVAILABLE:
      return Object.assign({}, state, action.details);
    case UPDATE_PROGRESS: {
      const { progress } = action;
      return Object.assign({}, state, { progress });
    }
    default:
      return state;
  }
}
