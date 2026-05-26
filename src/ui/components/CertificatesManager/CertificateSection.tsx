import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

import CertificateItem from './CertificateItem';

export type CertificateSectionProps = {
  title: string;
  hint: string;
  emptyText: string;
  urls: string[];
  isFirst?: boolean;
};

export const CertificateSection = ({
  title,
  hint,
  emptyText,
  urls,
  isFirst,
}: CertificateSectionProps) => {
  const { t } = useTranslation();
  return (
    <Box mbs={isFirst ? 0 : 32}>
      <Box fontScale='h4' color='font-default' mbe={8}>
        {title}
      </Box>
      <Box fontScale='c1' color='font-hint' mbe={16}>
        {hint}
      </Box>
      {urls.length === 0 ? (
        <Box fontScale='p2' color='font-annotation' pb={16}>
          {emptyText}
        </Box>
      ) : (
        <Table fixed>
          <TableHead>
            <TableRow>
              <TableCell>{t('certificatesManager.item.domain')}</TableCell>
              <TableCell align='end' width='x120'>
                {t('certificatesManager.item.actions')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {urls.map((url) => (
              <CertificateItem key={url} url={url} />
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};
