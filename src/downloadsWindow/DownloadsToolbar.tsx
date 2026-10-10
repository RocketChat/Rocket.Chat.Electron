import { Box, Icon } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

import { WindowToolbar } from '../ui/windowChrome/WindowToolbar';

/**
 * Title only. Clearing the list lives in the status bar next to the count it
 * affects, rather than as an unlabelled trash icon up here.
 */
export const DownloadsToolbar = () => {
  const { t } = useTranslation();

  return (
    <WindowToolbar>
      <Icon name='circle-arrow-down' size='x16' color='hint' />
      <Box
        marginInlineStart='x4'
        fontScale='p2b'
        color='default'
        withTruncatedText
      >
        {t('downloads.title')}
      </Box>
    </WindowToolbar>
  );
};
