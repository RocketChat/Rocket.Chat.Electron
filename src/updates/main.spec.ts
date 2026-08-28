import type {
  AppLevelUpdateConfiguration,
  UpdateConfiguration,
  UserLevelUpdateConfiguration,
} from './common';
import { mergeConfigurations } from './main';
import type * as MainModule from './main';

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
      updateStore: null,
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
      updateStore: null,
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
      updateStore: null,
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
      updateStore: null,
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

/**
 * Regression coverage for the windows check-for-updates path: it has no
 * version-lookup API (see storeUpdates.ts), so its
 * UPDATES_CHECK_FOR_UPDATES_REQUESTED handling opens the Microsoft Store
 * directly instead of running the checking/available sequence. Because
 * UPDATES_CHECK_FOR_UPDATES_REQUESTED's own reducer case (reducers.ts) flips
 * updateCheckStatus to 'checking' before this listener even runs, the
 * listener must explicitly dismiss that feedback afterward — otherwise the
 * titlebar is left stuck showing "Checking for updates…" forever (regression
 * verified live; see reducers.ts's UPDATES_CHECK_FEEDBACK_DISMISSED case).
 *
 * Uses jest.isolateModules + jest.doMock so this suite's mocks of `../store`
 * and `./storeUpdates` don't leak into the mergeConfigurations tests above,
 * which exercise the real modules.
 */
describe('setupUpdateLabelFlow — windows check-for-updates path', () => {
  type Listener = (action: { type: string; payload?: unknown }) => unknown;

  const loadWithMocks = (
    openStorePageImpl: jest.Mock
  ): { listeners: Map<string, Listener>; dispatch: jest.Mock } => {
    const listeners = new Map<string, Listener>();
    const dispatch = jest.fn();

    let setupUpdateLabelFlow!: () => void;

    jest.isolateModules(() => {
      jest.doMock('../store', () => ({
        listen: jest.fn((type: string, listener: Listener) => {
          listeners.set(type, listener);
          return () => listeners.delete(type);
        }),
        dispatch,
        select: jest.fn((selector: (state: unknown) => unknown) =>
          selector({})
        ),
      }));

      jest.doMock('./storeUpdates', () => ({
        detectUpdateStore: jest.fn(() => 'windows'),
        fetchLatestStoreVersion: jest.fn(),
        isStoreVersionNewer: jest.fn(),
        openStorePage: openStorePageImpl,
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mainModule = require('./main') as typeof MainModule;
      setupUpdateLabelFlow = mainModule.setupUpdateLabelFlow;
    });

    setupUpdateLabelFlow();

    return { listeners, dispatch };
  };

  afterEach(() => {
    jest.resetModules();
  });

  it('opens the Microsoft Store and returns to idle, without claiming a check result', async () => {
    const openStorePageImpl = jest.fn().mockResolvedValue(undefined);
    const { listeners, dispatch } = loadWithMocks(openStorePageImpl);

    const checkListener = listeners.get('updates/check-for-updates-requested');
    expect(checkListener).toBeDefined();

    await checkListener?.({ type: 'updates/check-for-updates-requested' });

    expect(openStorePageImpl).toHaveBeenCalledTimes(1);
    expect(openStorePageImpl).toHaveBeenCalledWith('windows');

    // Never claims a result — no "up to date" and no "new version" dispatch.
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'updates/new-version-not-available' })
    );
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'updates/new-version-available' })
    );

    // Settles the transient "checking" feedback back to idle instead of
    // leaving it stuck.
    expect(dispatch).toHaveBeenCalledWith({
      type: 'updates/check-feedback-dismissed',
    });
  });

  it('reports a real error (and does not dismiss to idle) when openStorePage fails', async () => {
    const openStorePageImpl = jest
      .fn()
      .mockRejectedValue(new Error('failed to open store'));
    const { listeners, dispatch } = loadWithMocks(openStorePageImpl);

    const checkListener = listeners.get('updates/check-for-updates-requested');
    await checkListener?.({ type: 'updates/check-for-updates-requested' });

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'updates/error-thrown' })
    );
    expect(dispatch).not.toHaveBeenCalledWith({
      type: 'updates/check-feedback-dismissed',
    });
  });
});
