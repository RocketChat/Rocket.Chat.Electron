import type { Reducer } from 'redux';

import type { ActionOf } from '../../store/actions';
import {
  ACTIVE_TAB,
  CLOSE_TAB,
  OPEN_NEW_TAB,
  TAB_TITLE_CHANGED,
} from '../actions';

type TabPaneAction =
  | ActionOf<typeof OPEN_NEW_TAB>
  | ActionOf<typeof CLOSE_TAB>
  | ActionOf<typeof ACTIVE_TAB>
  | ActionOf<typeof TAB_TITLE_CHANGED>;

type Tab = {
  url: string;
  text: string;
  serverUrl: string;
};
type TabPaneState = {
  tabs: Tab[];
  activeTabUrl: string | null;
};

const initialState: TabPaneState = {
  tabs: [],
  activeTabUrl: null,
};

export const tabs: Reducer<TabPaneState, TabPaneAction> = (
  state = initialState,
  action
) => {
  switch (action.type) {
    case OPEN_NEW_TAB: {
      const newTab = {
        url: action.payload.url,
        text: action.payload.text,
        serverUrl: action.payload.serverUrl,
      };
      return {
        tabs: [...state.tabs, newTab],
        activeTabUrl: action.payload.url,
      } as TabPaneState;
    }
    case CLOSE_TAB: {
      const remaining = state.tabs.filter((t) => t.url !== action.payload.url);
      const activeTabUrl =
        state.activeTabUrl === action.payload.url
          ? remaining[0]?.url ?? null
          : state.activeTabUrl;
      return { tabs: remaining, activeTabUrl };
    }
    case ACTIVE_TAB: {
      return { ...state, activeTabUrl: action.payload.url };
    }
    case TAB_TITLE_CHANGED: {
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.url === action.payload.url ? { ...t, text: action.payload.text } : t
        ),
      };
    }

    default:
      return state as TabPaneState;
  }
};
