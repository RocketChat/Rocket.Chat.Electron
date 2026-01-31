import { Box, FieldGroup } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

import { VerboseAppLogging } from './features/VerboseAppLogging';
import { VerboseAuthLogging } from './features/VerboseAuthLogging';
import { VerboseIpcLogging } from './features/VerboseIpcLogging';
import { VerboseLogViewerLogging } from './features/VerboseLogViewerLogging';
import { VerboseMainLogging } from './features/VerboseMainLogging';
import { VerboseNotificationsLogging } from './features/VerboseNotificationsLogging';
import { VerboseOutlookLogging } from './features/VerboseOutlookLogging';
import { VerboseServersLogging } from './features/VerboseServersLogging';
import { VerboseUiLogging } from './features/VerboseUiLogging';
import { VerboseUpdatesLogging } from './features/VerboseUpdatesLogging';
import { VerboseVideoCallLogging } from './features/VerboseVideoCallLogging';

export const DeveloperTab = () => {
  const { t } = useTranslation();

  return (
    <Box display='flex' justifyContent='center'>
      <FieldGroup is='form' maxWidth={600}>
        <Box fontScale='h4' mbe={16} color='font-default'>
          {t('settings.sections.logging')}
        </Box>
        <VerboseMainLogging />
        <VerboseAppLogging />
        <VerboseOutlookLogging />
        <VerboseAuthLogging />
        <VerboseIpcLogging />
        <VerboseUiLogging />
        <VerboseUpdatesLogging />
        <VerboseNotificationsLogging />
        <VerboseVideoCallLogging />
        <VerboseServersLogging />
        <VerboseLogViewerLogging />
      </FieldGroup>
    </Box>
  );
};
