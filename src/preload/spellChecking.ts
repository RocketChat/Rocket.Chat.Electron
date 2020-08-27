import { webFrame, Provider } from 'electron';

import {
  SPELL_CHECKING_MISSPELT_WORDS_REQUESTED,
  SPELL_CHECKING_MISSPELT_WORDS_RESPONDED,
} from '../actions';
import { RootState } from '../reducers';
import { watch, request } from '../store';
import { Dictionary } from '../structs/spellChecking';

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
  if (!language) {
    webFrame.setSpellCheckProvider('', noopSpellCheckProvider);
    return;
  }

  webFrame.setSpellCheckProvider(language, remoteSpellCheckProvider);
};

const selectSpellCheckingLanguage = ({ spellCheckingDictionaries }: RootState): Dictionary['name'] | undefined =>
  spellCheckingDictionaries
    .filter(({ enabled }) => enabled)
    .map(({ name }) => name)[0]
    ?.split(/[-_]/g)[0];

export const setupSpellChecking = (): void => {
  watch(selectSpellCheckingLanguage, (spellCheckingLanguage) => {
    setSpellCheckProvider(spellCheckingLanguage);
  });
};
