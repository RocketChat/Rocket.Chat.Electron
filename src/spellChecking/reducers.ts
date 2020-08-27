import { Reducer } from 'redux';

import { PERSISTABLE_VALUES_MERGED } from '../app/actions';
import { ActionOf } from '../store/actions';
import { WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED } from '../ui/actions';
import { SPELL_CHECKING_DICTIONARIES_UPDATED } from './actions';
import { Dictionary, compareDictionaries } from './common';

type SpellCheckingDictionariesAction = (
  ActionOf<typeof PERSISTABLE_VALUES_MERGED>
  | ActionOf<typeof SPELL_CHECKING_DICTIONARIES_UPDATED>
  | ActionOf<typeof WEBVIEW_SPELL_CHECKING_DICTIONARY_TOGGLED>
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
