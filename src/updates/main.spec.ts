import type {
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
      isVideoCallScreenCaptureFallbackEnabled: false,
      updateChannel: 'latest',
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
      isVideoCallScreenCaptureFallbackEnabled: false,
      updateChannel: 'latest',
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
      isVideoCallScreenCaptureFallbackEnabled: false,
      updateChannel: 'latest',
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
      isVideoCallScreenCaptureFallbackEnabled: false,
      updateChannel: 'latest',
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

// Add these inside describe('mergeConfigurations') block

it('merges app channel configuration', () => {
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
    isVideoCallScreenCaptureFallbackEnabled: false,
    updateChannel: 'latest',
  };
  const appConfiguration: AppLevelUpdateConfiguration = {
    channel: 'beta',
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
    updateChannel: 'beta',
  });
});

it('user channel overrides default when configurable', () => {
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
    isVideoCallScreenCaptureFallbackEnabled: false,
    updateChannel: 'latest',
  };
  const appConfiguration: AppLevelUpdateConfiguration = {};
  const userConfiguration: UserLevelUpdateConfiguration = {
    channel: 'alpha',
  };

  expect(
    mergeConfigurations(
      defaultConfiguration,
      appConfiguration,
      userConfiguration
    )
  ).toStrictEqual({
    ...defaultConfiguration,
    updateChannel: 'alpha',
  });
});

it('forced app config blocks user channel override', () => {
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
    isVideoCallScreenCaptureFallbackEnabled: false,
    updateChannel: 'latest',
  };
  const appConfiguration: AppLevelUpdateConfiguration = {
    forced: true,
    channel: 'beta',
  };
  const userConfiguration: UserLevelUpdateConfiguration = {
    channel: 'alpha',
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
    updateChannel: 'beta', // user alpha ignored because forced
  });
});

it('handles null skip value in user configuration', () => {
  const defaultConfiguration: UpdateConfiguration = {
    doCheckForUpdatesOnStartup: true,
    isEachUpdatesSettingConfigurable: true,
    isUpdatingAllowed: true,
    isUpdatingEnabled: true,
    skippedUpdateVersion: '1.0.0',
    isReportEnabled: true,
    isFlashFrameEnabled: true,
    isHardwareAccelerationEnabled: true,
    isInternalVideoChatWindowEnabled: true,
    isVideoCallScreenCaptureFallbackEnabled: false,
    updateChannel: 'latest',
  };
  const appConfiguration: AppLevelUpdateConfiguration = {};
  const userConfiguration: UserLevelUpdateConfiguration = {};

  expect(
    mergeConfigurations(
      defaultConfiguration,
      appConfiguration,
      userConfiguration
    )
  ).toStrictEqual({
    ...defaultConfiguration,
    skippedUpdateVersion: '1.0.0', // unchanged
  });
});
 





});
