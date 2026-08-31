import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import { CertificatesTab } from './CertificatesTab';
import { DeveloperTab } from './DeveloperTab';
import { GeneralTab } from './GeneralTab';
import { VoiceVideoTab } from './VoiceVideoTab';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../CertificatesManager', () => ({
  CertificatesManager: () => <div data-testid='certificates-manager' />,
}));

jest.mock('./features/DebugLogging', () => ({
  DebugLogging: () => <div data-testid='debug-logging' />,
}));
jest.mock('./features/DetailedEventsLogging', () => ({
  DetailedEventsLogging: () => <div data-testid='detailed-events' />,
}));
jest.mock('./features/VerboseOutlookLogging', () => ({
  VerboseOutlookLogging: () => <div data-testid='verbose-outlook' />,
}));

jest.mock('./features/ThemeAppearance', () => ({
  ThemeAppearance: () => <div data-testid='theme-appearance' />,
}));
jest.mock('./features/NavigationLayout', () => ({
  NavigationLayout: () => <div data-testid='nav-layout' />,
}));
jest.mock('./features/TrayIcon', () => ({
  TrayIcon: () => <div data-testid='tray' />,
}));
jest.mock('./features/FlashFrame', () => ({
  FlashFrame: () => <div data-testid='flash' />,
}));
jest.mock('./features/DownloadsPercentage', () => ({
  DownloadsPercentage: () => <div data-testid='downloads-percentage' />,
}));
jest.mock('./features/AvailableBrowsers', () => ({
  AvailableBrowsers: () => <div data-testid='browsers' />,
}));
jest.mock('./features/OutlookCalendarSyncInterval', () => ({
  OutlookCalendarSyncInterval: () => <div data-testid='outlook-interval' />,
}));
jest.mock('./features/HardwareAcceleration', () => ({
  HardwareAcceleration: () => <div data-testid='hw' />,
}));
jest.mock('./features/E2ePdfPreviewSizeLimit', () => ({
  E2ePdfPreviewSizeLimit: () => <div data-testid='pdf-limit' />,
}));
jest.mock('./features/ReportErrors', () => ({
  ReportErrors: () => <div data-testid='report' />,
}));
jest.mock('./features/TransparentWindow', () => ({
  TransparentWindow: () => <div data-testid='transparent' />,
}));
jest.mock('./features/MinimizeOnClose', () => ({
  MinimizeOnClose: () => <div data-testid='minimize' />,
}));
jest.mock('./features/MenuBar', () => ({
  MenuBar: () => <div data-testid='menubar' />,
}));
jest.mock('./features/NTLMCredentials', () => ({
  NTLMCredentials: () => <div data-testid='ntlm' />,
}));

jest.mock('./features/Telephony', () => ({
  Telephony: () => <div data-testid='telephony' />,
}));
jest.mock('./features/TelephonyGlobalShortcut', () => ({
  TelephonyGlobalShortcut: () => <div data-testid='telephony-shortcut' />,
}));
jest.mock('./features/TelephonyServer', () => ({
  TelephonyServer: () => <div data-testid='telephony-server' />,
}));
jest.mock('./features/InternalVideoChatWindow', () => ({
  InternalVideoChatWindow: () => <div data-testid='internal-video' />,
}));
jest.mock('./features/VideoCallWindowPersistence', () => ({
  VideoCallWindowPersistence: () => <div data-testid='video-persist' />,
}));
jest.mock('./features/ScreenCaptureFallback', () => ({
  ScreenCaptureFallback: () => <div data-testid='screen-fallback' />,
}));
jest.mock('./features/ClearPermittedScreenCaptureServers', () => ({
  ClearPermittedScreenCaptureServers: () => <div data-testid='clear-perm' />,
}));

describe('Settings tabs', () => {
  it('CertificatesTab renders certificates manager', () => {
    render(<CertificatesTab />);
    expect(screen.getByTestId('certificates-manager')).toBeInTheDocument();
  });

  it('DeveloperTab renders logging section features', () => {
    render(<DeveloperTab />);
    expect(screen.getByText('settings.sections.logging')).toBeInTheDocument();
    expect(screen.getByTestId('debug-logging')).toBeInTheDocument();
    expect(screen.getByTestId('verbose-outlook')).toBeInTheDocument();
    expect(screen.getByTestId('detailed-events')).toBeInTheDocument();
  });

  it('GeneralTab mounts core settings groups', () => {
    render(<GeneralTab />);
    expect(screen.getByTestId('nav-layout')).toBeInTheDocument();
    expect(screen.getByTestId('tray')).toBeInTheDocument();
    expect(screen.getByTestId('flash')).toBeInTheDocument();
    expect(screen.getByTestId('browsers')).toBeInTheDocument();
    expect(screen.getByTestId('hw')).toBeInTheDocument();
    expect(screen.getByTestId('report')).toBeInTheDocument();
  });

  it('VoiceVideoTab mounts telephony and video sections', () => {
    render(<VoiceVideoTab />);
    expect(screen.getByText('settings.sections.telephony')).toBeInTheDocument();
    expect(
      screen.getByText('settings.sections.videoCalls')
    ).toBeInTheDocument();
    expect(screen.getByTestId('telephony')).toBeInTheDocument();
    expect(screen.getByTestId('internal-video')).toBeInTheDocument();
  });
});
