import { session, webContents } from 'electron';

import { watch } from '../../common/effects/watch';

const getAllSessions = () =>
  Array.from(
    new Set([
      session.defaultSession,
      ...webContents
        .getAllWebContents()
        .map((webContents) => webContents.session),
    ])
  );

export function* spellCheckingSaga(): Generator {
  yield* watch(
    (state) => state.app.spellCheckerLanguages.current,
    function* (languages) {
      for (const session of getAllSessions()) {
        session.setSpellCheckerLanguages(languages);
      }
    }
  );
}
