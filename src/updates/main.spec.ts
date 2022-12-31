import {
  AppLevelUpdateConfiguration,
  UpdateConfiguration,
  UserLevelUpdateConfiguration,
} from './common';
import { mergeConfigurations } from './main';

describe('mergeConfigurations', () => {
  it('keeps default configuration', () => {
    const defaultConfiguration: UpdateConfiguration = {
      doCheckForUpdatesOnStartup: true,
      isEachUpdatesSettingConfigurable: true,
      isUpdatingAllowed: true,
      isUpdatingEnabled: true,
      skippedUpdateVersion: null,
      isReportEnabled: true,
      isFlashFrameEnabled: true,
      isHardwareAccelerationEnabled: true,
      isInternalVideoChatWindowEnabled: true,
    };
    const appConfiguration: AppLevelUpdateConfiguration = {};
    const userConfiguration: UserLevelUpdateConfiguration = {};

    expect(
      mergeConfigurations(
        defaultConfiguration,
        appConfiguration,
        userConfiguration
      )
    ).toStrictEqual(defaultConfiguration);
  });

  it('merges app configuration', () => {
    const defaultConfiguration: UpdateConfiguration = {
      doCheckForUpdatesOnStartup: true,
      isEachUpdatesSettingConfigurable: true,
      isUpdatingAllowed: true,
      isUpdatingEnabled: true,
      skippedUpdateVersion: null,
      isReportEnabled: true,
      isFlashFrameEnabled: true,
      isHardwareAccelerationEnabled: true,
      isInternalVideoChatWindowEnabled: true,
    };
    const appConfiguration: AppLevelUpdateConfiguration = {
      autoUpdate: false,
      canUpdate: false,
    };
    const userConfiguration: UserLevelUpdateConfiguration = {};

    expect(
      mergeConfigurations(
        defaultConfiguration,
        appConfiguration,
        userConfiguration
      )
    ).toStrictEqual({
      ...defaultConfiguration,
      doCheckForUpdatesOnStartup: false,
      isUpdatingEnabled: false,
    });
  });

  it('merges user configuration', () => {
    const defaultConfiguration: UpdateConfiguration = {
      doCheckForUpdatesOnStartup: true,
      isEachUpdatesSettingConfigurable: true,
      isUpdatingAllowed: true,
      isUpdatingEnabled: true,
      skippedUpdateVersion: null,
      isReportEnabled: true,
      isFlashFrameEnabled: true,
      isHardwareAccelerationEnabled: true,
      isInternalVideoChatWindowEnabled: true,
    };
    const appConfiguration: AppLevelUpdateConfiguration = {
      autoUpdate: false,
      canUpdate: false,
    };
    const userConfiguration: UserLevelUpdateConfiguration = {
      autoUpdate: true,
      skip: 'x.y.z',
    };

    expect(
      mergeConfigurations(
        defaultConfiguration,
        appConfiguration,
        userConfiguration
      )
    ).toStrictEqual({
      ...defaultConfiguration,
      doCheckForUpdatesOnStartup: true,
      isUpdatingEnabled: false,
      skippedUpdateVersion: 'x.y.z',
    });
  });

  it('may force app configuration', () => {
    const defaultConfiguration: UpdateConfiguration = {
      doCheckForUpdatesOnStartup: true,
      isEachUpdatesSettingConfigurable: true,
      isUpdatingAllowed: true,
      isUpdatingEnabled: true,
      skippedUpdateVersion: null,
      isReportEnabled: true,
      isFlashFrameEnabled: true,
      isHardwareAccelerationEnabled: true,
      isInternalVideoChatWindowEnabled: true,
    };
    const appConfiguration: AppLevelUpdateConfiguration = {
      forced: true,
      autoUpdate: false,
      canUpdate: false,
    };
    const userConfiguration: UserLevelUpdateConfiguration = {
      autoUpdate: true,
      skip: 'x.y.z',
    };

    expect(
      mergeConfigurations(
        defaultConfiguration,
        appConfiguration,
        userConfiguration
      )
    ).toStrictEqual({
      ...defaultConfiguration,
      isEachUpdatesSettingConfigurable: false,
      doCheckForUpdatesOnStartup: false,
      isUpdatingEnabled: false,
      skippedUpdateVersion: 'x.y.z',
    });
  });
});
