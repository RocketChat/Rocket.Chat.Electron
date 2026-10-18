import type { Session } from 'electron';
import { app, session, webContents } from 'electron';

import { listen } from '../store';
import {
  SPELL_CHECKING_LANGUAGE_TOGGLED,
  SPELL_CHECKING_TOGGLED,
} from './actions';

// A server session can outlive its webview: Electron reuses it for the next
// webview of the same partition and does not emit session-created again.
const createdSessions = new Set<Session>();

const setSpellCheckerLanguages = async (
  languages: Set<string>
): Promise<void> => {
  await app.whenReady();

  const filteredLanguages = Array.from(languages).filter((language) =>
    session.defaultSession.availableSpellCheckerLanguages.includes(language)
  );

  const sessions = new Set<Session>([
    session.defaultSession,
    ...createdSessions,
  ]);
  webContents.getAllWebContents().forEach((webContents) => {
    sessions.add(webContents.session);
  });
  sessions.forEach((target) => {
    // On Windows and Linux, Electron turns spell check on when the language
    // list is not empty. Keep it off when the user turned it off.
    const wasEnabled = target.isSpellCheckerEnabled();
    target.setSpellCheckerLanguages(filteredLanguages);
    if (!wasEnabled && filteredLanguages.length > 0) {
      target.setSpellCheckerEnabled(false);
    }
  });
};

const setSpellCheckerEnabled = async (enabled: boolean): Promise<void> => {
  await app.whenReady();

  const sessions = new Set<Session>([
    session.defaultSession,
    ...createdSessions,
  ]);
  webContents.getAllWebContents().forEach((webContents) => {
    sessions.add(webContents.session);
  });
  sessions.forEach((session) => session.setSpellCheckerEnabled(enabled));
};

export const setupSpellChecking = async (): Promise<void> => {
  setSpellCheckerLanguages(
    new Set(session.defaultSession.getSpellCheckerLanguages())
  );

  // Each server webview has its own persist:<url> partition, so a session
  // created after the toggle must copy the on/off state of the default one.
  app.on('session-created', (createdSession) => {
    createdSessions.add(createdSession);
    createdSession.setSpellCheckerEnabled(
      session.defaultSession.isSpellCheckerEnabled()
    );
  });

  listen(SPELL_CHECKING_TOGGLED, (action) => {
    setSpellCheckerEnabled(action.payload);
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
