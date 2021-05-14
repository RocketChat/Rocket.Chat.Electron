import { invoke } from '../ipc/renderer';

export const getCurrentState = (): Promise<any> =>
  invoke('redux/get-initial-state');
