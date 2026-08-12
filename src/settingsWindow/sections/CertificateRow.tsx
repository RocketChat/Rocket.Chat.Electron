import { Box, Icon, IconButton, Tag } from '@rocket.chat/fuselage';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { invoke } from '../../ipc/renderer';
import type { Surfaces } from '../../ui/windowChrome/appearance';
import { LIST_ROW_CLASS } from '../../ui/windowChrome/styles';

export type CertificateRowProps = {
  domain: string;
  isTrusted: boolean;
  surfaces: Surfaces;
};

/**
 * One certificate as a list row, in the same shape as a download: an icon, the
 * domain, and the actions that apply to it. The trust state is a tag on the row
 * rather than which of two tables it happened to be in.
 */
export const CertificateRow = ({
  domain,
  isTrusted,
  surfaces,
}: CertificateRowProps) => {
  const { t } = useTranslation();

  const handleRemove = useCallback(async () => {
    const confirmed = await invoke(
      'settings-window/confirm-remove-certificate',
      domain
    );
    if (!confirmed) return;
    invoke('certificatesManager/remove', domain);
  }, [domain]);

  return (
    <Box
      className={LIST_ROW_CLASS}
      display='flex'
      flexDirection='row'
      alignItems='center'
      paddingInline='x12'
      paddingBlock='x8'
      style={{ borderBlockEnd: `1px solid ${surfaces.divider}` }}
    >
      <Icon
        name={isTrusted ? 'shield-check' : 'shield-alt'}
        size='x20'
        color={isTrusted ? 'status-font-on-success' : 'status-font-on-danger'}
      />

      <Box flexGrow={1} marginInline='x12' style={{ minWidth: 0 }}>
        <Box fontScale='p2' color='default' withTruncatedText title={domain}>
          {domain}
        </Box>
      </Box>

      <Box flexShrink={0} marginInlineEnd='x8'>
        <Tag variant={isTrusted ? 'secondary' : 'secondary-danger'}>
          {isTrusted
            ? t('certificatesManager.state.trusted')
            : t('certificatesManager.state.notTrusted')}
        </Tag>
      </Box>

      <IconButton
        tiny
        icon='cross'
        title={t('certificatesManager.item.remove')}
        aria-label={t('certificatesManager.item.remove')}
        onClick={handleRemove}
      />
    </Box>
  );
};
