import { UPDATES_READY, PERSISTABLE_VALUES_MERGED } from '../actions';

export const isEachUpdatesSettingConfigurable = (state = true, { type, payload }) => {
	switch (type) {
		case UPDATES_READY: {
			const { isEachUpdatesSettingConfigurable } = payload;
			return isEachUpdatesSettingConfigurable;
		}

		case PERSISTABLE_VALUES_MERGED: {
			const { isEachUpdatesSettingConfigurable = state } = payload;
			return isEachUpdatesSettingConfigurable;
		}
	}
	return state;
};
