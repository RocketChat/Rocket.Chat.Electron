import { webFrame, Provider } from 'electron';
import { Effect } from 'redux-saga/effects';

import { SPELL_CHECKING_MISSPELT_WORDS_REQUESTED } from '../actions';
import { request } from '../channels';
import { selectChanges } from '../selectChanges';
import { selectDictionaryName } from '../selectors';

const noopSpellCheckProvider: Provider = {
  spellCheck: (_words, callback) => callback([]),
};

const remoteSpellCheckProvider: Provider = {
  spellCheck: async (words, callback) => {
    const misspeltWords: string[] = await request(SPELL_CHECKING_MISSPELT_WORDS_REQUESTED, words);
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

export function *attachSpellChecking(): Generator<Effect, void> {
  yield selectChanges(selectDictionaryName, function *(dictionaryName: string) {
    const spellCheckingLanguage = dictionaryName ? dictionaryName.split(/[-_]/g)[0] : null;
    setSpellCheckProvider(spellCheckingLanguage);
  });
}
