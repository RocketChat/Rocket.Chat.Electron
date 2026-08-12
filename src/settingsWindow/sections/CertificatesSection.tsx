import {
  Box,
  Icon,
  SearchInput,
  States,
  StatesIcon,
  StatesSubtitle,
  StatesTitle,
} from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import type { RootState } from '../../store/rootReducer';
import { SectionLabel } from '../../ui/windowChrome/SectionLabel';
import type { Surfaces } from '../../ui/windowChrome/appearance';
import { SEARCH_FIELD_CLASS } from '../../ui/windowChrome/styles';
import { fuzzyMatch } from '../fuzzy';
import { CertificateRow } from './CertificateRow';

export type CertificatesSectionProps = {
  surfaces: Surfaces;
};

type CertificateEntry = {
  domain: string;
  isTrusted: boolean;
};

/**
 * One list of every certificate the app has an opinion about, trusted and not,
 * each row saying which it is — rather than two tables where the state is
 * implied by which one you happen to be reading.
 */
export const CertificatesSection = ({ surfaces }: CertificatesSectionProps) => {
  const { t } = useTranslation();

  const trustedCertificates = useSelector(
    ({ trustedCertificates }: RootState) => trustedCertificates
  );
  const notTrustedCertificates = useSelector(
    ({ notTrustedCertificates }: RootState) => notTrustedCertificates
  );

  const [filter, setFilter] = useState('');

  const handleFilterChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setFilter(event.target.value);
    },
    []
  );

  // Untrusted first: they are the ones worth acting on.
  const certificates = useMemo<CertificateEntry[]>(
    () => [
      ...Object.keys(notTrustedCertificates ?? {}).map((domain) => ({
        domain,
        isTrusted: false,
      })),
      ...Object.keys(trustedCertificates ?? {}).map((domain) => ({
        domain,
        isTrusted: true,
      })),
    ],
    [notTrustedCertificates, trustedCertificates]
  );

  const visible = useMemo(
    () =>
      filter.trim() === ''
        ? certificates
        : certificates.filter(({ domain }) => fuzzyMatch(filter, domain)),
    [certificates, filter]
  );

  const trustedCount = certificates.filter(({ isTrusted }) => isTrusted).length;

  return (
    <Box display='flex' flexDirection='column' style={{ minHeight: 0 }}>
      <Box className={SEARCH_FIELD_CLASS} marginBlockEnd='x12'>
        <SearchInput
          addon={<Icon name='magnifier' size='x20' />}
          aria-label={t('certificatesManager.filter')}
          placeholder={t('certificatesManager.filter')}
          value={filter}
          onChange={handleFilterChange}
        />
      </Box>

      {certificates.length > 0 && (
        <Box marginBlockEnd='x8'>
          <SectionLabel>
            {t('certificatesManager.summary', {
              count: certificates.length,
              trusted: trustedCount,
            })}
          </SectionLabel>
        </Box>
      )}

      {visible.length === 0 ? (
        <States>
          <StatesIcon
            name={certificates.length === 0 ? 'shield' : 'magnifier'}
          />
          <StatesTitle>
            {certificates.length === 0
              ? t('certificatesManager.empty.title')
              : t('certificatesManager.noResults.title')}
          </StatesTitle>
          <StatesSubtitle>
            {certificates.length === 0
              ? t('certificatesManager.empty.subtitle')
              : t('certificatesManager.noResults.subtitle')}
          </StatesSubtitle>
        </States>
      ) : (
        <Box
          borderWidth='x1'
          borderColor='extra-light'
          borderRadius='x4'
          style={{ overflow: 'hidden' }}
        >
          {visible.map(({ domain, isTrusted }) => (
            <CertificateRow
              key={`${isTrusted ? 'trusted' : 'not-trusted'}:${domain}`}
              domain={domain}
              isTrusted={isTrusted}
              surfaces={surfaces}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
