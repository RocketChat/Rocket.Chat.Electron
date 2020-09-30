import { session } from 'electron';

import { listen } from '../store';
import {
  SPELL_CHECKING_LANGUAGE_TOGGLED,
  SPELL_CHECKING_TOGGLED,
} from './actions';

export const setupSpellChecking = async (): Promise<void> => {
  const spellCheckerLanguages = session.defaultSession.getSpellCheckerLanguages();
  session.fromPartition('persist:rocketchat-server').setSpellCheckerLanguages(spellCheckerLanguages);

  listen(SPELL_CHECKING_TOGGLED, (action) => {
    const spellCheckerLanguages = action.payload ? session.defaultSession.getSpellCheckerLanguages() : [];
    session.defaultSession.setSpellCheckerLanguages(spellCheckerLanguages);
    session.fromPartition('persist:rocketchat-server').setSpellCheckerLanguages(spellCheckerLanguages);
  });

  listen(SPELL_CHECKING_LANGUAGE_TOGGLED, (action) => {
    const spellCheckerLanguages = new Set(session.defaultSession.getSpellCheckerLanguages());

    if (action.payload.enabled) {
      spellCheckerLanguages.add(action.payload.name);
    } else {
      spellCheckerLanguages.delete(action.payload.name);
    }

    session.defaultSession.setSpellCheckerLanguages(Array.from(spellCheckerLanguages));
    session.fromPartition('persist:rocketchat-server').setSpellCheckerLanguages(Array.from(spellCheckerLanguages));
  });
};
