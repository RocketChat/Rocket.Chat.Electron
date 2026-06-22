import {
  Accordion,
  AccordionItem,
  Box,
  FieldGroup,
} from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

import { ClearPermittedScreenCaptureServers } from './features/ClearPermittedScreenCaptureServers';
import { InternalVideoChatWindow } from './features/InternalVideoChatWindow';
import { ScreenCaptureFallback } from './features/ScreenCaptureFallback';
import { Telephony } from './features/Telephony';
import { TelephonyGlobalShortcut } from './features/TelephonyGlobalShortcut';
import { TelephonyServer } from './features/TelephonyServer';
import { VideoCallWindowPersistence } from './features/VideoCallWindowPersistence';

export const VoiceVideoTab = () => {
  const { t } = useTranslation();

  return (
    <Box display='flex' justifyContent='center'>
      <Box maxWidth={600} width='100%'>
        <Accordion>
          <AccordionItem
            title={t('settings.sections.telephony')}
            defaultExpanded
          >
            <FieldGroup is='form'>
              <Telephony />
              <TelephonyGlobalShortcut />
              <TelephonyServer />
            </FieldGroup>
          </AccordionItem>
          <AccordionItem
            title={t('settings.sections.videoCalls')}
            defaultExpanded
          >
            <FieldGroup is='form'>
              <InternalVideoChatWindow />
              <VideoCallWindowPersistence />
              {process.platform === 'win32' && <ScreenCaptureFallback />}
              {!process.mas && <ClearPermittedScreenCaptureServers />}
            </FieldGroup>
          </AccordionItem>
        </Accordion>
      </Box>
    </Box>
  );
};
