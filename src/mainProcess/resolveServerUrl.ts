import type { ServerUrlResolutionResult } from '../common/types/ServerUrlResolutionResult';
import { invoke } from '../ipc/main';
import { getRootWindow } from './rootWindow';

export const resolveServerUrl = async (
  input: string
): Promise<ServerUrlResolutionResult> => {
  const { webContents } = await getRootWindow();
  return invoke(webContents, 'servers/resolve-url', input);
};
