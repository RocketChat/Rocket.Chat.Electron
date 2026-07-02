import { handle } from '../ipc/main';
import { getTelephonyDiagnostics } from './diagnostics';

export const setupTelephonyIpc = (): void => {
  handle('telephony/get-diagnostics', async () => getTelephonyDiagnostics());
};
