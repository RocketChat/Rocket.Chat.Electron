import type { PersistableValues } from '../common/types/PersistableValues';
import { getElectronStore } from './getElectronStore';

export const getPersistedValues = (): PersistableValues =>
  getElectronStore().store;
