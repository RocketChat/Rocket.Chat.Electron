import type { RootState } from '../common/types/RootState';
import type { UpdateConfiguration } from '../common/types/UpdateConfiguration';
import { joinAppPath } from './joinAppPath';
import { joinUserPath } from './joinUserPath';
import { readJsonObject } from './readJsonObject';

export const mergeUpdatesConfiguration = async (
  state: RootState
): Promise<RootState> => {
  const defaultConfiguration: UpdateConfiguration = {
    allowed:
      (process.platform === 'linux' && !!process.env.APPIMAGE) ||
      (process.platform === 'win32' && !process.windowsStore) ||
      (process.platform === 'darwin' && !process.mas),
    editable: true,
    enabled: state.updates.settings.enabled,
    checkOnStartup: state.updates.settings.checkOnStartup,
    skippedVersion: state.updates.settings.skippedVersion,
  };
  const appConfiguration = await readJsonObject(joinAppPath('update.json'));
  const userConfiguration = await readJsonObject(joinUserPath('update.json'));

  const configuration = {
    ...defaultConfiguration,
    ...(typeof appConfiguration.forced === 'boolean' && {
      editable: !appConfiguration.forced,
    }),
    ...(typeof appConfiguration.canUpdate === 'boolean' && {
      enabled: appConfiguration.canUpdate,
    }),
    ...(typeof appConfiguration.autoUpdate === 'boolean' && {
      checkOnStartup: appConfiguration.autoUpdate,
    }),
    ...(typeof appConfiguration.skip === 'string' && {
      skippedVersion: appConfiguration.skip,
    }),
  };

  if (
    typeof userConfiguration.autoUpdate === 'boolean' &&
    (configuration.editable ||
      typeof appConfiguration.autoUpdate === 'undefined')
  ) {
    configuration.checkOnStartup = userConfiguration.autoUpdate;
  }

  if (
    typeof userConfiguration.skip === 'string' &&
    (configuration.editable || typeof appConfiguration.skip === 'undefined')
  ) {
    configuration.skippedVersion = userConfiguration.skip;
  }

  return {
    ...state,
    updates: {
      ...state.updates,
      allowed: configuration.allowed,
      settings: {
        ...state.updates.settings,
        editable: configuration.editable,
        enabled: configuration.enabled,
        checkOnStartup: configuration.checkOnStartup,
        skippedVersion: configuration.skippedVersion,
      },
    },
  };
};
