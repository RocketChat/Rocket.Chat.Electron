import { Reducer } from 'redux';

import { APP_SETTINGS_LOADED } from '../app/actions';
import { ActionOf } from '../store/actions';
import {
  WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED,
  WEBVIEW_SPELL_CHECKING_TOGGLED,
} from '../ui/actions';
import {
  SPELL_CHECKING_DICTIONARIES_LOADED,
} from './actions';
import { Dictionary, compareDictionaries } from './common';

type SpellCheckingDictionariesAction = (
  ActionOf<typeof APP_SETTINGS_LOADED>
  | ActionOf<typeof SPELL_CHECKING_DICTIONARIES_LOADED>
  | ActionOf<typeof WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED>
  | ActionOf<typeof WEBVIEW_SPELL_CHECKING_TOGGLED>
);

export const spellCheckingDictionaries: Reducer<Dictionary[], SpellCheckingDictionariesAction> = (state = [], action) => {
  switch (action.type) {
    case WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED: {
      const { name, enabled } = action.payload;
      return state.map((dictionary) => {
        if (name === dictionary.name) {
          return {
            ...dictionary,
            enabled,
          };
        }

        return enabled ? { ...dictionary, enabled: false } : dictionary;
      });
    }

    case WEBVIEW_SPELL_CHECKING_TOGGLED: {
      return state.map(({ name }) => ({
        name,
        enabled: action.payload,
      }));
    }

    case SPELL_CHECKING_DICTIONARIES_LOADED:
      return action.payload.sort(compareDictionaries);

    case APP_SETTINGS_LOADED: {
      const { spellCheckingDictionaries = state } = action.payload;
      return spellCheckingDictionaries.sort(compareDictionaries);
    }

    default:
      return state;
  }
};
