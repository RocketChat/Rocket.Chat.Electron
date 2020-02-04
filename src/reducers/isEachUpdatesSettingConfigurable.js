import { UPDATES_READY } from '../actions';

export const isEachUpdatesSettingConfigurable = (state = true, { type, payload }) => {
	switch (type) {
		case UPDATES_READY: {
			const { isEachUpdatesSettingConfigurable } = payload;
			return isEachUpdatesSettingConfigurable;
		}
	}
	return state;
};
