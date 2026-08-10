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
  Component: ComponentType<SettingsSectionProps>;
};

export const SETTINGS_SECTIONS: SettingsSectionDefinition[] = [
  {
    id: 'general',
    icon: 'cog',
    labelKey: 'settings.general',
    settingKeys: [
      'settings.options.trayIcon',
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
    ],
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
    Component: AdvancedSection,
  },
];
