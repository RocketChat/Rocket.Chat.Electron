import { session } from 'electron';

import { dispatch, select, watch } from '../store';
import { SPELL_CHECKING_DICTIONARIES_LOADED } from './actions';
import { Dictionary } from './common';

const loadSpellCheckingDictionaries = async (): Promise<Dictionary[]> => {
  const spellCheckerLanguages = select(
    ({ spellCheckingDictionaries }) => spellCheckingDictionaries
      .filter((spellCheckingDictionary) => spellCheckingDictionary.enabled)
      .map((spellCheckingDictionary) => spellCheckingDictionary.name),
  );
  return session.defaultSession.availableSpellCheckerLanguages.map((availableSpellCheckerLanguage) => ({
    name: availableSpellCheckerLanguage,
    enabled: spellCheckerLanguages.includes(availableSpellCheckerLanguage),
  }));
};

const toggleDictionary = ({ name, enabled }: Dictionary): void => {
  const spellCheckerLanguages = new Set(
    select(
      ({ spellCheckingDictionaries }) => spellCheckingDictionaries
        .filter((spellCheckingDictionary) => spellCheckingDictionary.enabled)
        .map((spellCheckingDictionary) => spellCheckingDictionary.name),
    ),
  );

  if (enabled) {
    spellCheckerLanguages.add(name);
  } else {
    spellCheckerLanguages.delete(name);
  }

  session.defaultSession.setSpellCheckerLanguages(Array.from(spellCheckerLanguages));
  session.fromPartition('persist:rocketchat-server').setSpellCheckerLanguages(Array.from(spellCheckerLanguages));
};

export const setupSpellChecking = async (): Promise<void> => {
  const spellCheckingDictionaries = await loadSpellCheckingDictionaries();

  spellCheckingDictionaries.forEach(toggleDictionary);

  dispatch({
    type: SPELL_CHECKING_DICTIONARIES_LOADED,
    payload: spellCheckingDictionaries,
  });

  watch(({ spellCheckingDictionaries }) => spellCheckingDictionaries, (spellCheckingDictionaries) => {
    spellCheckingDictionaries.map((dictionary) => toggleDictionary(dictionary));
  });
};
