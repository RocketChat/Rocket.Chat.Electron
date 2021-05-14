import { UPDATES_READY } from '../common/actions/updatesActions';
import type { RootState } from '../common/reducers';
import { dispatch } from '../common/store';
import { joinAppPath } from './joinAppPath';
import { joinUserPath } from './joinUserPath';
import { readJsonObject } from './readJsonObject';

export const mergeUpdatesConfiguration = async (
  state: RootState
): Promise<RootState> => {
  const defaultConfiguration = {
    isUpdatingAllowed:
      (process.platform === 'linux' && !!process.env.APPIMAGE) ||
      (process.platform === 'win32' && !process.windowsStore) ||
      (process.platform === 'darwin' && !process.mas),
    isEachUpdatesSettingConfigurable: true,
    isUpdatingEnabled: state.isUpdatingEnabled,
    doCheckForUpdatesOnStartup: state.doCheckForUpdatesOnStartup,
    skippedUpdateVersion: state.skippedUpdateVersion,
  };
  const appConfiguration = await readJsonObject(joinAppPath('update.json'));
  const userConfiguration = await readJsonObject(joinUserPath('update.json'));

  const configuration = {
    ...defaultConfiguration,
    ...(typeof appConfiguration.forced === 'boolean' && {
      isEachUpdatesSettingConfigurable: !appConfiguration.forced,
    }),
    ...(typeof appConfiguration.canUpdate === 'boolean' && {
      isUpdatingEnabled: appConfiguration.canUpdate,
    }),
    ...(typeof appConfiguration.autoUpdate === 'boolean' && {
      doCheckForUpdatesOnStartup: appConfiguration.autoUpdate,
    }),
    ...(typeof appConfiguration.skip === 'string' && {
      skippedUpdateVersion: appConfiguration.skip,
    }),
  };

  if (
    typeof userConfiguration.autoUpdate === 'boolean' &&
    (configuration.isEachUpdatesSettingConfigurable ||
      typeof appConfiguration.autoUpdate === 'undefined')
  ) {
    configuration.doCheckForUpdatesOnStartup = userConfiguration.autoUpdate;
  }

  if (
    typeof userConfiguration.skip === 'string' &&
    (configuration.isEachUpdatesSettingConfigurable ||
      typeof appConfiguration.skip === 'undefined')
  ) {
    configuration.skippedUpdateVersion = userConfiguration.skip;
  }

  dispatch({
    type: UPDATES_READY,
    payload: configuration,
  });

  return {
    ...state,
    isUpdatingAllowed: state.isUpdatingAllowed,
    isEachUpdatesSettingConfigurable: state.isEachUpdatesSettingConfigurable,
    isUpdatingEnabled: state.isUpdatingEnabled,
    doCheckForUpdatesOnStartup: state.doCheckForUpdatesOnStartup,
    skippedUpdateVersion: state.skippedUpdateVersion,
  };
};
