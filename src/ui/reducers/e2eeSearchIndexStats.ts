import type { Reducer } from 'redux';

import type { E2EESearchServerIndexStats } from '../../e2eeSearch/types';
import type { ActionOf } from '../../store/actions';
import { E2EE_SEARCH_INDEX_STATS_UPDATED } from '../actions';

// What Settings shows for the local search index of encrypted messages. The
// main process fills it on request. It is not persisted.
export const e2eeSearchIndexStats: Reducer<
  E2EESearchServerIndexStats[] | null,
  ActionOf<typeof E2EE_SEARCH_INDEX_STATS_UPDATED>
> = (state = null, action) => {
  switch (action.type) {
    case E2EE_SEARCH_INDEX_STATS_UPDATED:
      return action.payload;

    default:
      return state;
  }
};
