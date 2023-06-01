import { app, session, webContents } from 'electron';

import { listen } from '../store';
import {
  SPELL_CHECKING_LANGUAGE_TOGGLED,
  SPELL_CHECKING_TOGGLED,
} from './actions';

const setSpellCheckerLanguages = async (
  languages: Set<string>
): Promise<void> => {
  await app.whenReady();

  const filteredLanguages = Array.from(languages).filter((language) =>
    session.defaultSession.availableSpellCheckerLanguages.includes(language)
  );

  session.defaultSession.setSpellCheckerLanguages(filteredLanguages);
  webContents.getAllWebContents().forEach((webContents) => {
    webContents.session.setSpellCheckerLanguages(filteredLanguages);
  });
};

export const setupSpellChecking = async (): Promise<void> => {
  setSpellCheckerLanguages(
    new Set(session.defaultSession.getSpellCheckerLanguages())
  );

  listen(SPELL_CHECKING_TOGGLED, (action) => {
    const spellCheckerLanguages = new Set(
      action.payload ? session.defaultSession.getSpellCheckerLanguages() : []
    );
    setSpellCheckerLanguages(spellCheckerLanguages);
  });

  listen(SPELL_CHECKING_LANGUAGE_TOGGLED, (action) => {
    const spellCheckerLanguages = new Set(
      session.defaultSession.getSpellCheckerLanguages()
    );

    if (action.payload.enabled) {
      spellCheckerLanguages.add(action.payload.name);
    } else {
      spellCheckerLanguages.delete(action.payload.name);
    }

    setSpellCheckerLanguages(spellCheckerLanguages);
  });
};
