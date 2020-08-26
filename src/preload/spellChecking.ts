import { webFrame, Provider } from 'electron';

import {
  SPELL_CHECKING_MISSPELT_WORDS_REQUESTED,
  SPELL_CHECKING_MISSPELT_WORDS_RESPONDED,
} from '../actions';
import { selectDictionaryName } from '../selectors';
import { watch, request } from '../store';

const noopSpellCheckProvider: Provider = {
  spellCheck: (_words, callback) => callback([]),
};

const remoteSpellCheckProvider: Provider = {
  spellCheck: async (words, callback) => {
    const misspeltWords: string[] = await request<
      typeof SPELL_CHECKING_MISSPELT_WORDS_REQUESTED,
      typeof SPELL_CHECKING_MISSPELT_WORDS_RESPONDED
    >({
      type: SPELL_CHECKING_MISSPELT_WORDS_REQUESTED,
      payload: words,
    });
    callback(misspeltWords);
  },
};

const setSpellCheckProvider = (language: string): void => {
  if (language === null) {
    webFrame.setSpellCheckProvider('', noopSpellCheckProvider);
    return;
  }

  webFrame.setSpellCheckProvider(language, remoteSpellCheckProvider);
};

export const setupSpellChecking = (): void => {
  watch(selectDictionaryName, (dictionaryName: string) => {
    const spellCheckingLanguage = dictionaryName ? dictionaryName.split(/[-_]/g)[0] : null;
    setSpellCheckProvider(spellCheckingLanguage);
  });
};
