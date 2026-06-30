import type { Reducer } from 'redux';

import type { ActionOf } from '../../store/actions';
import {
  ACTIVE_TAB,
  CLOSE_TAB,
  OPEN_NEW_TAB,
  TAB_TITLE_CHANGED,
} from '../actions';

import { APP_SETTINGS_LOADED } from '../../app/actions';

type TabPaneAction =
  | ActionOf<typeof OPEN_NEW_TAB>
  | ActionOf<typeof CLOSE_TAB>
  | ActionOf<typeof ACTIVE_TAB>
  | ActionOf<typeof TAB_TITLE_CHANGED>
  | ActionOf<typeof APP_SETTINGS_LOADED>;

export type Tab = {
  url: string;
  text: string;
  serverUrl: string;
};
export type TabPaneState = {
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
    case APP_SETTINGS_LOADED: {
      const persistedTabs = action.payload.tabs;

      if (!persistedTabs || !Array.isArray(persistedTabs.tabs)) {
        return state;
      }

      return {
        tabs: persistedTabs.tabs.filter(
          (tab) =>
            typeof tab.url === 'string' &&
            typeof tab.text === 'string' &&
            typeof tab.serverUrl === 'string'
        ),
        activeTabUrl:
          typeof persistedTabs.activeTabUrl === 'string'
            ? persistedTabs.activeTabUrl
            : persistedTabs.tabs[0]?.url ?? null,
      };
    }

    default:
      return state as TabPaneState;
  }
};
