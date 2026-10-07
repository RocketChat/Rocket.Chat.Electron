import { safeSelect } from '../../store';
import { getServerUrl } from './urls';

// The UI preview serves the standalone Vite client, which has no Meteor module
// system, so `window.require` never appears and `injected.ts` must not treat
// its absence as a wedged boot.
export const isUiPreviewActive = (): boolean =>
  Boolean(
    safeSelect(
      ({ servers }) =>
        servers.find((server) => server.url === getServerUrl())?.uiPreview
    )
  );
