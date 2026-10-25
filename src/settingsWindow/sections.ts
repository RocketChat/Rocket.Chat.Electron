import type { Keys as IconName } from '@rocket.chat/icons';
import type { ComponentType } from 'react';

import type { Surfaces } from '../ui/windowChrome/appearance';
import { AdvancedSection } from './sections/AdvancedSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { CertificatesSection } from './sections/CertificatesSection';
import { GeneralSection } from './sections/GeneralSection';
import { TelephonySection } from './sections/TelephonySection';
import { VideoCallsSection } from './sections/VideoCallsSection';

export type SettingsSectionId =
  | 'general'
  | 'appearance'
  | 'certificates'
  | 'telephony'
  | 'videoCalls'
  | 'advanced';

/** What decides whether a section renders a setting. */
export type SettingAvailabilityContext = {
  isDeveloperModeEnabled: boolean;
  canUpdate: boolean;
  /** A store build checks for updates through its store, not electron-updater. */
  isStoreUpdate: boolean;
  platform: NodeJS.Platform;
  serverCount: number;
  isOutlookCalendarSyncIntervalOverridden: boolean;
};

type SettingAvailability = (context: SettingAvailabilityContext) => boolean;

const developerModeOnly: SettingAvailability = ({ isDeveloperModeEnabled }) =>
  isDeveloperModeEnabled;
const onPlatform =
  (...platforms: NodeJS.Platform[]): SettingAvailability =>
  ({ platform }) =>
    platforms.includes(platform);
const canCheckForUpdates: SettingAvailability = ({
  isStoreUpdate,
  canUpdate,
}) => isStoreUpdate || canUpdate;

/** Every section is handed the window's surfaces; most ignore them. */
export type SettingsSectionProps = {
  surfaces: Surfaces;
};

export type SettingsSectionDefinition = {
  id: SettingsSectionId;
  icon: IconName;
  /** i18n key for the section's own name. */
  labelKey: string;
  /**
   * i18n keys of the settings the section holds — an options namespace, whose
   * title *and* option labels are all searchable, so "light" finds Theme.
   *
   * This is a hand-kept index: the feature components own their own labels, and
   * reaching into them for text would mean rendering every section just to
   * search. Adding a setting without listing it here only costs it a search
   * hit, never a broken section; adding an *option* to a listed setting needs
   * no change at all.
   */
  settingKeys: string[];
  /**
   * The conditions under which the section renders a listed setting. A key
   * with no entry always renders. Keep each entry equal to the condition in
   * the section component, so search never finds a setting the reader cannot
   * see.
   */
  settingAvailability?: Partial<Record<string, SettingAvailability>>;
  Component: ComponentType<SettingsSectionProps>;
};

export const SETTINGS_SECTIONS: SettingsSectionDefinition[] = [
  {
    id: 'general',
    icon: 'cog',
    labelKey: 'settings.general',
    settingKeys: [
      'settings.options.trayIcon',
      'settings.options.trayIconUnreadCounter',
      'settings.options.menuBarUnreadCount',
      'settings.options.minimizeOnClose',
      'settings.options.menubar',
      'settings.options.flashFrame',
      'settings.options.downloadsPercentage',
      'settings.options.availableBrowsers',
      'settings.options.outlookCalendarSyncInterval',
      'settings.options.e2ePdfPreviewSizeLimit',
      'settings.options.ntlmCredentials',
      'dialog.about.checkUpdates',
      'dialog.about.checkUpdatesOnStart',
    ],
    settingAvailability: {
      'settings.options.menuBarUnreadCount': onPlatform('darwin'),
      'settings.options.minimizeOnClose': onPlatform('win32'),
      'settings.options.menubar': ({ platform }) =>
        platform !== 'darwin' && platform !== 'win32',
      'settings.options.outlookCalendarSyncInterval': ({
        isOutlookCalendarSyncIntervalOverridden,
      }) => !isOutlookCalendarSyncIntervalOverridden,
      'settings.options.ntlmCredentials': onPlatform('win32'),
      'dialog.about.checkUpdates': canCheckForUpdates,
      'dialog.about.checkUpdatesOnStart': canCheckForUpdates,
    },
    Component: GeneralSection,
  },
  {
    id: 'appearance',
    icon: 'palette',
    labelKey: 'settings.appearance',
    settingKeys: [
      'settings.options.themeAppearance',
      'settings.options.navigation',
      'settings.options.transparentWindow',
      'settings.options.uiPreview',
    ],
    settingAvailability: {
      'settings.options.transparentWindow': onPlatform('darwin'),
      'settings.options.uiPreview': (context) =>
        developerModeOnly(context) && context.serverCount > 0,
    },
    Component: AppearanceSection,
  },
  {
    id: 'certificates',
    icon: 'shield',
    labelKey: 'settings.certificates',
    settingKeys: ['settings.certificates', 'certificatesManager'],
    Component: CertificatesSection,
  },
  {
    id: 'telephony',
    icon: 'phone',
    labelKey: 'settings.sections.telephony',
    settingKeys: [
      'settings.options.telephony',
      'settings.options.telephonyShortcut',
      'settings.options.telephonyServer',
    ],
    settingAvailability: {
      'settings.options.telephonyServer': ({ serverCount }) => serverCount > 1,
    },
    Component: TelephonySection,
  },
  {
    id: 'videoCalls',
    icon: 'video',
    labelKey: 'settings.sections.videoCalls',
    settingKeys: [
      'settings.options.internalVideoChatWindow',
      'settings.options.videoCallWindowPersistence',
      'settings.options.videoCallScreenCaptureFallback',
      'settings.options.clearPermittedScreenCaptureServers',
    ],
    settingAvailability: {
      'settings.options.videoCallScreenCaptureFallback': onPlatform('win32'),
    },
    Component: VideoCallsSection,
  },
  {
    id: 'advanced',
    icon: 'cog',
    labelKey: 'settings.sections.advanced',
    settingKeys: [
      'dialog.about.updateChannel.label',
      'settings.options.hardwareAcceleration',
      'settings.options.report',
      'settings.options.verboseOutlookLogging',
      'settings.options.detailedEventsLogging',
      'settings.options.debugLogging',
    ],
    settingAvailability: {
      'dialog.about.updateChannel.label': ({
        isDeveloperModeEnabled,
        canUpdate,
      }) => isDeveloperModeEnabled && canUpdate,
      'settings.options.verboseOutlookLogging': developerModeOnly,
      'settings.options.detailedEventsLogging': developerModeOnly,
      'settings.options.debugLogging': developerModeOnly,
    },
    Component: AdvancedSection,
  },
];
