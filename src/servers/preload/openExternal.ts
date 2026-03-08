import { invoke } from '../../ipc/renderer';

export const openExternal = (url: string): Promise<void> =>
  invoke('open-external', url);
