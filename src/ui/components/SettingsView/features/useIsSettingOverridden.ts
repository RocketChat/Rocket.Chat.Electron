import { useSelector } from 'react-redux';

import type { PersistableValues } from '../../../../app/PersistableValues';
import type { RootState } from '../../../../store/rootReducer';

/** Whether an administrator set this setting in `overridden-settings.json`. */
export const useIsSettingOverridden = (key: keyof PersistableValues): boolean =>
  useSelector(({ overriddenSettingKeys }: RootState) =>
    overriddenSettingKeys.includes(key)
  );
