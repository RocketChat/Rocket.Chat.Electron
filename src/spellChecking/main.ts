import { dispatch, select, watch } from '../store';
import { getRootWindow } from '../ui/main/rootWindow';
import { getAllServerWebContents } from '../ui/main/webviews';
import { SPELL_CHECKING_DICTIONARIES_LOADED } from './actions';
import { Dictionary } from './common';

const loadSpellCheckingDictionaries = async (): Promise<Dictionary[]> => {
  const spellCheckerLanguages = select(
    ({ spellCheckingDictionaries }) => spellCheckingDictionaries
      .filter((spellCheckingDictionary) => spellCheckingDictionary.enabled)
      .map((spellCheckingDictionary) => spellCheckingDictionary.name),
  );
  return getRootWindow().webContents.session.availableSpellCheckerLanguages.map((availableSpellCheckerLanguage) => ({
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

  getRootWindow().webContents.session.setSpellCheckerLanguages(Array.from(spellCheckerLanguages));
  getAllServerWebContents().forEach((webContents) => {
    webContents.session.setSpellCheckerLanguages(Array.from(spellCheckerLanguages));
    console.log(webContents.session.getSpellCheckerLanguages());
  });
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
