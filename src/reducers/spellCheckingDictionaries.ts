import { Reducer } from 'redux';

import {
  WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED,
  SPELL_CHECKING_DICTIONARIES_UPDATED,
  PERSISTABLE_VALUES_MERGED,
  SpellCheckingDictionariesActionTypes,
} from '../actions';
import { Dictionary, compareDictionaries } from '../structs/spellChecking';

export const spellCheckingDictionaries: Reducer<Dictionary[], SpellCheckingDictionariesActionTypes> = (state = [], action) => {
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

    case SPELL_CHECKING_DICTIONARIES_UPDATED:
      return action.payload.sort(compareDictionaries);

    case PERSISTABLE_VALUES_MERGED: {
      const { spellCheckingDictionaries = state } = action.payload;
      return spellCheckingDictionaries.sort(compareDictionaries);
    }

    default:
      return state;
  }
};
