import { EXTERNAL_PROTOCOL_PERMISSION_UPDATED } from '../common/actions/navigationActions';
import { dispatch, select } from '../common/store';
import { askForOpeningExternalProtocol } from './dialogs';

export const isProtocolAllowed = async (rawUrl: string): Promise<boolean> => {
  const url = new URL(rawUrl);

  const instrinsicProtocols = ['http:', 'https:', 'mailto:'];
  const persistedProtocols = Object.entries(
    select(({ externalProtocols }) => externalProtocols)
  )
    .filter(([, allowed]) => allowed)
    .map(([protocol]) => protocol);
  const allowedProtocols = [...instrinsicProtocols, ...persistedProtocols];

  if (allowedProtocols.includes(url.protocol)) {
    return true;
  }

  const { allowed, dontAskAgain } = await askForOpeningExternalProtocol(url);

  if (dontAskAgain) {
    dispatch({
      type: EXTERNAL_PROTOCOL_PERMISSION_UPDATED,
      payload: {
        protocol: url.protocol,
        allowed,
      },
    });
  }

  return allowed;
};
