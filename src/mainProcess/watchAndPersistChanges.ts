import { selectPersistableValues } from '../common/selectPersistableValues';
import { watch } from '../common/store';
import { persistValues } from './persistValues';

export const watchAndPersistChanges = (): void => {
  watch(selectPersistableValues, (values) => {
    persistValues(values);
  });
};
