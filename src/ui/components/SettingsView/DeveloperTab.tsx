import { Box, FieldGroup } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

import { DetailedEventsLogging } from './features/DetailedEventsLogging';
import { VerboseOutlookLogging } from './features/VerboseOutlookLogging';

export const DeveloperTab = () => {
  const { t } = useTranslation();

  return (
    <Box display='flex' justifyContent='center'>
      <FieldGroup is='form' maxWidth={600}>
        <Box fontScale='h4' mbe={16} color='font-default'>
          {t('settings.sections.logging')}
        </Box>
        <VerboseOutlookLogging />
        <DetailedEventsLogging />
      </FieldGroup>
    </Box>
  );
};
