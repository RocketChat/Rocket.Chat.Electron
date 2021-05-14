import type { PersistableValues } from '../common/types/PersistableValues';
import { getElectronStore } from './getElectronStore';

export const persistValues = (values: PersistableValues): void => {
  getElectronStore().set(values);
};
