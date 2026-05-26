import { Box, FieldGroup } from '@rocket.chat/fuselage';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { AvailableBrowsers } from './features/AvailableBrowsers';
import { ClearPermittedScreenCaptureServers } from './features/ClearPermittedScreenCaptureServers';
import { FlashFrame } from './features/FlashFrame';
import { HardwareAcceleration } from './features/HardwareAcceleration';
import { InternalVideoChatWindow } from './features/InternalVideoChatWindow';
import { MenuBar } from './features/MenuBar';
import { MinimizeOnClose } from './features/MinimizeOnClose';
import { NTLMCredentials } from './features/NTLMCredentials';
import { OutlookCalendarSyncInterval } from './features/OutlookCalendarSyncInterval';
import { ReportErrors } from './features/ReportErrors';
import { ScreenCaptureFallback } from './features/ScreenCaptureFallback';
import { SideBar } from './features/SideBar';
import { TelephonyServer } from './features/TelephonyServer';
import { ThemeAppearance } from './features/ThemeAppearance';
import { TransparentWindow } from './features/TransparentWindow';
import { TrayIcon } from './features/TrayIcon';
import { VideoCallWindowPersistence } from './features/VideoCallWindowPersistence';

type SectionProps = {
  title: string;
  isFirst?: boolean;
  children: ReactNode;
};

const Section = ({ title, isFirst, children }: SectionProps) => (
  <Box mbs={isFirst ? 0 : 32} mbe={16}>
    <Box fontScale='h4' color='font-default' mbe={16}>
      {title}
    </Box>
    <FieldGroup>{children}</FieldGroup>
  </Box>
);

export const GeneralTab = () => {
  const { t } = useTranslation();

  return (
    <Box display='flex' justifyContent='center'>
      <Box is='form' maxWidth={600} width='full'>
        <Section title={t('settings.sections.notifications')} isFirst>
          <ReportErrors />
          <FlashFrame />
        </Section>

        <Section title={t('settings.sections.performance')}>
          <HardwareAcceleration />
          {process.platform === 'win32' && <ScreenCaptureFallback />}
        </Section>

        <Section title={t('settings.sections.callsAndVideo')}>
          <InternalVideoChatWindow />
          <VideoCallWindowPersistence />
          <TelephonyServer />
          {!process.mas && <ClearPermittedScreenCaptureServers />}
        </Section>

        <Section title={t('settings.sections.windowAndAppearance')}>
          {process.platform === 'darwin' && <TransparentWindow />}
          <TrayIcon />
          {process.platform === 'win32' && <MinimizeOnClose />}
          <SideBar />
          {process.platform !== 'darwin' && <MenuBar />}
          <ThemeAppearance />
        </Section>

        <Section title={t('settings.sections.integrations')}>
          {process.platform === 'win32' && <NTLMCredentials />}
          <AvailableBrowsers />
          <OutlookCalendarSyncInterval />
        </Section>
      </Box>
    </Box>
  );
};
