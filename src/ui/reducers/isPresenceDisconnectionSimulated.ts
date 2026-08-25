import type { Reducer } from 'redux';

import type { ActionOf } from '../../store/actions';
import { SET_PRESENCE_DISCONNECTION_SIMULATED } from '../actions';

type IsPresenceDisconnectionSimulatedAction = ActionOf<
  typeof SET_PRESENCE_DISCONNECTION_SIMULATED
>;

export const isPresenceDisconnectionSimulated: Reducer<
  boolean,
  IsPresenceDisconnectionSimulatedAction
> = (state = false, action) => {
  switch (action.type) {
    case SET_PRESENCE_DISCONNECTION_SIMULATED:
      return action.payload;

    default:
      return state;
  }
};
