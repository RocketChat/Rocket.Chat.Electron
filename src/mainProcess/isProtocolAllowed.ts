import * as externalProtocolActions from '../common/actions/externalProtocolActions';
import { dispatch, select } from '../common/store';
import { askForOpeningExternalProtocol } from './dialogs';

export const isProtocolAllowed = async (rawUrl: string): Promise<boolean> => {
  const url = new URL(rawUrl);

  const instrinsicProtocols = ['http:', 'https:', 'mailto:'];
  const persistedProtocols = Object.entries(
    select((state) => state.navigation.externalProtocols)
  )
    .filter(([, allowed]) => allowed)
    .map(([protocol]) => protocol);
  const allowedProtocols = [...instrinsicProtocols, ...persistedProtocols];

  if (allowedProtocols.includes(url.protocol)) {
    return true;
  }

  const { allowed, dontAskAgain } = await askForOpeningExternalProtocol(url);

  if (dontAskAgain) {
    dispatch(
      allowed
        ? externalProtocolActions.allowed(url.protocol)
        : externalProtocolActions.denied(url.protocol)
    );
  }

  return allowed;
};
