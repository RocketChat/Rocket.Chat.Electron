import { migrations } from '../PersistableValues';
import { DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB } from '../../constants';

const setProcessPlatform = (value: NodeJS.Platform): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
  if (!descriptor?.configurable) {
    return;
  }

  Object.defineProperty(process, 'platform', {
    value,
    configurable: true,
  });
};

const clearProcessPlatform = (): void => {
  Object.defineProperty(process, 'platform', {
    value: 'darwin',
    configurable: true,
  });
};

const setProcessMas = (value: boolean): void => {
  Object.defineProperty(process, 'mas', {
    value,
    configurable: true,
    writable: true,
  });
};

describe('PersistableValues migrations', () => {
  afterEach(() => {
    clearProcessPlatform();
    setProcessMas(false);
  });

  it('builds legacy currentServerUrl into object-based currentView', () => {
    const before = {
      currentServerUrl: 'https://example.com',
      currentView: 'settings',
      isReportEnabled: true,
      isInternalVideoChatWindowEnabled: false,
      isFlashFrameEnabled: false,
      isAddNewServersEnabled: false,
    } as unknown as Parameters<(typeof migrations)['>=3.1.0']>[0];

    expect(migrations['>=3.1.0'](before)).toMatchObject({
      currentView: { url: 'https://example.com' },
      downloads: {},
    });
  });

  it('reuses existing currentView and falls back to add-new-server', () => {
    const before = {
      currentServerUrl: undefined,
      currentView: undefined,
      isReportEnabled: true,
      isInternalVideoChatWindowEnabled: false,
      isFlashFrameEnabled: false,
      isAddNewServersEnabled: false,
    } as unknown as Parameters<(typeof migrations)['>=3.1.0']>[0];

    expect(migrations['>=3.1.0'](before)).toMatchObject({
      currentView: 'add-new-server',
      downloads: {},
    });
  });

  it('reuses existing non-nullish currentView when currentServerUrl is absent', () => {
    const before = {
      currentServerUrl: undefined,
      currentView: 'settings',
      isReportEnabled: true,
      isInternalVideoChatWindowEnabled: false,
      isFlashFrameEnabled: false,
      isAddNewServersEnabled: false,
    } as unknown as Parameters<(typeof migrations)['>=3.1.0']>[0];

    expect(migrations['>=3.1.0'](before)).toMatchObject({
      currentView: 'settings',
      downloads: {},
    });
  });

  it('falls back to add-new-server when currentView is absent entirely', () => {
    const before = {
      currentServerUrl: undefined,
    } as unknown as Parameters<(typeof migrations)['>=3.1.0']>[0];

    expect(migrations['>=3.1.0'](before).currentView).toBe('add-new-server');
  });

  it('falls back to add-new-server when currentView is nullish', () => {
    const before = {
      currentServerUrl: undefined,
      currentView: null as any,
    } as unknown as Parameters<(typeof migrations)['>=3.1.0']>[0];

    expect(migrations['>=3.1.0'](before).currentView).toBe('add-new-server');
  });

  it('adds telephony shortcut config without losing a persisted telephony server', () => {
    const before = {
      telephonyPreferredServer: 'https://chat.example.com',
    } as unknown as Parameters<(typeof migrations)['>=4.14.0']>[0];

    expect(migrations['>=4.14.0'](before)).toEqual({
      isTelephonyEnabled: false,
      telephonyPreferredServer: 'https://chat.example.com',
      telephonyGlobalShortcutConfig: {
        enabled: false,
        accelerator: null,
      },
    });
  });

  it('defaults telephony shortcut config when legacy value is missing', () => {
    const before = {
      isDebugLoggingEnabled: true,
    } as unknown as Parameters<(typeof migrations)['>=4.14.0']>[0];

    expect(migrations['>=4.14.0'](before)).toMatchObject({
      isTelephonyEnabled: false,
      telephonyPreferredServer: null,
      telephonyGlobalShortcutConfig: {
        enabled: false,
        accelerator: null,
      },
    });
  });

  it('defaults accelerator when telephony shortcut config lacks accelerator', () => {
    const before = {
      isDebugLoggingEnabled: true,
      telephonyGlobalShortcutConfig: {
        enabled: true,
      },
    } as unknown as Parameters<(typeof migrations)['>=4.14.0']>[0];

    expect(
      migrations['>=4.14.0'](before).telephonyGlobalShortcutConfig
    ).toEqual({
      enabled: true,
      accelerator: null,
    });
  });

  it('preserves configured telephony shortcut accelerator', () => {
    const before = {
      isDebugLoggingEnabled: true,
      telephonyGlobalShortcutConfig: {
        enabled: true,
        accelerator: 'CmdOrCtrl+Shift+P',
      },
    } as unknown as Parameters<(typeof migrations)['>=4.14.0']>[0];

    expect(
      migrations['>=4.14.0'](before).telephonyGlobalShortcutConfig
    ).toEqual({
      enabled: true,
      accelerator: 'CmdOrCtrl+Shift+P',
    });
  });

  it('adds report defaults based on platform on 3.8.x migrations', () => {
    const before = {
      isReportEnabled: false,
      isInternalVideoChatWindowEnabled: false,
      isFlashFrameEnabled: false,
      isAddNewServersEnabled: false,
      isMinimizeOnCloseEnabled: false,
      hasHideOnTrayNotificationShown: false,
      isNTLMCredentialsEnabled: false,
      allowedNTLMCredentialsDomains: null,
      lastSelectedServerUrl: '',
      mainWindowTitle: 'Rocket.Chat',
      machineTheme: 'light',
      selectedBrowser: null,
      isDeveloperModeEnabled: false,
      updateChannel: 'latest',
      isVideoCallDevtoolsAutoOpenEnabled: false,
      isTransparentWindowEnabled: false,
      isVideoCallScreenCaptureFallbackEnabled: false,
      userThemePreference: 'auto',
      outlookCalendarSyncInterval: 30,
      isVerboseOutlookLoggingEnabled: true,
      isDetailedEventsLoggingEnabled: true,
      isDebugLoggingEnabled: true,
      isTelephonyEnabled: false,
      telephonyPreferredServer: null,
      telephonyGlobalShortcutConfig: {
        enabled: false,
        accelerator: null,
      },
    } as unknown as Parameters<(typeof migrations)['>=3.8.0']>[0];

    setProcessPlatform('darwin');
    setProcessMas(false);
    expect(migrations['>=3.8.0'](before)).toMatchObject({
      isReportEnabled: true,
    });

    setProcessMas(true);
    expect(migrations['>=3.8.0'](before)).toMatchObject({
      isReportEnabled: false,
    });

    setProcessMas(false);
    expect(migrations['>=3.8.0'](before)).toMatchObject({
      isReportEnabled: true,
    });
  });

  it('uses platform-specific branches for earlier migration defaults', () => {
    const before = {
      currentServerUrl: 'https://example.com',
      isReportEnabled: false,
      isInternalVideoChatWindowEnabled: false,
      isFlashFrameEnabled: false,
      isAddNewServersEnabled: false,
    } as unknown as Parameters<(typeof migrations)['>=3.1.0']>[0];

    const base = migrations['>=3.1.0'](before);

    setProcessPlatform('linux');
    const linux35 = migrations['>=3.5.0'](base as any);
    expect(linux35.isFlashFrameEnabled).toBe(false);

    setProcessPlatform('win32');
    const win35 = migrations['>=3.5.0'](base as any);
    expect(win35.isFlashFrameEnabled).toBe(true);

    const win37 = migrations['>=3.7.9'](win35 as any);
    expect(win37.isMinimizeOnCloseEnabled).toBe(true);

    setProcessMas(true);
    const mas38_4 = migrations['>=3.8.4'](win37 as any);
    expect(mas38_4.isInternalVideoChatWindowEnabled).toBe(false);
  });

  it('applies remaining migration defaults through 4.15.0', () => {
    const before = {
      currentServerUrl: 'https://example.com',
      currentView: 'settings',
      isReportEnabled: false,
      isInternalVideoChatWindowEnabled: false,
      isFlashFrameEnabled: false,
      isAddNewServersEnabled: false,
      isMinimizeOnCloseEnabled: false,
      hasHideOnTrayNotificationShown: false,
      isNTLMCredentialsEnabled: false,
      allowedNTLMCredentialsDomains: null,
      lastSelectedServerUrl: '',
      mainWindowTitle: 'Rocket.Chat',
      machineTheme: 'light',
      selectedBrowser: null,
      isDeveloperModeEnabled: false,
      updateChannel: 'latest',
      isVideoCallDevtoolsAutoOpenEnabled: false,
      isTransparentWindowEnabled: false,
      isVideoCallScreenCaptureFallbackEnabled: false,
      userThemePreference: 'auto',
      outlookCalendarSyncInterval: 30,
      isVerboseOutlookLoggingEnabled: true,
      isDetailedEventsLoggingEnabled: true,
      isDebugLoggingEnabled: true,
      isTelephonyEnabled: false,
      telephonyPreferredServer: null,
      telephonyGlobalShortcutConfig: {
        enabled: false,
        accelerator: null,
      },
    } as any;

    const from38_0 = migrations['>=3.8.0'](before);
    const from38_4 = migrations['>=3.8.4'](from38_0 as any);
    const from38_7 = migrations['>=3.8.7'](from38_4 as any);
    const from38_9 = migrations['>=3.8.9'](from38_7 as any);
    const from38_12 = migrations['>=3.8.12'](from38_9 as any);
    const from3_9_6 = migrations['>=3.9.6'](from38_12 as any);
    const from4_1_0 = migrations['>=4.1.0'](from3_9_6 as any);
    const from4_2_0 = migrations['>=4.2.0'](from4_1_0 as any);
    const from4_4_0 = migrations['>=4.4.0'](from4_2_0 as any);
    const from4_5_0 = migrations['>=4.5.0'](from4_4_0 as any);
    const from4_7_2 = migrations['>=4.7.2'](from4_5_0 as any);
    const from4_9_0 = migrations['>=4.9.0'](from4_7_2 as any);
    const from4_10_0 = migrations['>=4.10.0'](from4_9_0 as any);
    const from4_11_0 = migrations['>=4.11.0'](from4_10_0 as any);
    const from4_13_0 = migrations['>=4.13.0'](from4_11_0 as any);
    const from4_14_0 = migrations['>=4.14.0'](from4_13_0 as any);
    const from4_15_0 = migrations['>=4.15.0'](from4_14_0 as any);

    expect(from4_15_0).toMatchObject({
      hasHideOnTrayNotificationShown: false,
      isNTLMCredentialsEnabled: false,
      telephonyGlobalShortcutConfig: {
        enabled: false,
        accelerator: null,
      },
      isHardwareAccelerationEnabled: true,
      isVideoCallDevtoolsAutoOpenEnabled: false,
      isVideoCallScreenCaptureFallbackEnabled: false,
      outlookCalendarSyncInterval: 60,
      isVerboseOutlookLoggingEnabled: false,
      isDetailedEventsLoggingEnabled: false,
      isDebugLoggingEnabled: false,
      e2ePdfPreviewSizeLimit: DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB,
    });
  });

  it('adds default e2e PDF preview size limit', () => {
    const before = {
      e2ePdfPreviewSizeLimit: 0,
    } as unknown as Parameters<(typeof migrations)['>=4.15.0']>[0];

    expect(migrations['>=4.15.0'](before).e2ePdfPreviewSizeLimit).toBe(
      DEFAULT_E2E_PDF_PREVIEW_SIZE_LIMIT_MB
    );
  });
});
