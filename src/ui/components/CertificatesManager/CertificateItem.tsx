import { Box, TableCell, TableRow } from '@rocket.chat/fuselage';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { invoke } from '../../../ipc/renderer';
import ActionButton from './ActionButton';

type CertificateItemProps = {
  url: string;
};

const CertificateItem = ({ url }: CertificateItemProps) => {
  const { t } = useTranslation();

  const handleRemove = useCallback(() => {
    invoke('certificatesManager/remove', url);
  }, [url]);

  return (
    <TableRow key={url}>
      <TableCell>
        <Box withTruncatedText title={url}>
          {url}
        </Box>
      </TableCell>
      <TableCell align='end'>
        <ActionButton onClick={handleRemove}>
          {t('certificatesManager.item.remove')}
        </ActionButton>
      </TableCell>
    </TableRow>
  );
};

export default CertificateItem;
