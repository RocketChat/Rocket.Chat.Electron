import { Box, Field, FieldLabel, FieldRow } from '@rocket.chat/fuselage';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import type {
  E2EESearchLimitReason,
  E2EESearchServerIndexStats,
} from '../../../../e2eeSearch/types';
import { dispatch } from '../../../../store';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_E2EE_SEARCH_INDEX_STATS_REQUESTED } from '../../../actions';

type E2eeSearchIndexStatsProps = {
  className?: string;
};

const atRestKeys: Record<E2EESearchServerIndexStats['atRest'], string> = {
  'encrypted': 'settings.options.e2eeSearchIndexStats.encrypted',
  'memory-only': 'settings.options.e2eeSearchIndexStats.memoryOnly',
  'mixed': 'settings.options.e2eeSearchIndexStats.mixed',
};

const limitKeys: Record<E2EESearchLimitReason, string> = {
  'no-encryption': 'settings.options.e2eeSearchIndexStats.limit.no-encryption',
  'basic-text-backend':
    'settings.options.e2eeSearchIndexStats.limit.basic-text-backend',
  'keychain-timeout':
    'settings.options.e2eeSearchIndexStats.limit.keychain-timeout',
  'hard-coded-wrap':
    'settings.options.e2eeSearchIndexStats.limit.hard-coded-wrap',
  'native-module-unavailable':
    'settings.options.e2eeSearchIndexStats.limit.native-module-unavailable',
};

// The local search index of encrypted messages, for each server: how many
// messages it holds, how much disk it takes, and whether it is encrypted on
// disk. The main process collects it when Settings asks.
export const E2eeSearchIndexStats = (props: E2eeSearchIndexStatsProps) => {
  const { t } = useTranslation();
  const stats = useSelector(
    ({ e2eeSearchIndexStats }: RootState) => e2eeSearchIndexStats
  );

  useEffect(() => {
    dispatch({ type: SETTINGS_E2EE_SEARCH_INDEX_STATS_REQUESTED });
  }, []);

  return (
    <Field className={props.className}>
      <FieldLabel>
        {t('settings.options.e2eeSearchIndexStats.title')}
      </FieldLabel>
      {stats?.length === 0 && (
        <FieldRow>
          <Box fontScale='p2' color='hint'>
            {t('settings.options.e2eeSearchIndexStats.empty')}
          </Box>
        </FieldRow>
      )}
      {stats?.map((server) => (
        <FieldRow key={server.serverUrl ?? 'removed'}>
          <Box display='flex' flexDirection='column' minWidth={0}>
            <Box fontScale='p2m' color='default' withTruncatedText>
              {server.serverUrl ??
                t('settings.options.e2eeSearchIndexStats.removedServer')}
            </Box>
            <Box fontScale='c1' color='hint'>
              {[
                server.docs === undefined
                  ? t('settings.options.e2eeSearchIndexStats.notLoaded')
                  : t('settings.options.e2eeSearchIndexStats.messages', {
                      count: server.docs,
                    }),
                t('settings.options.e2eeSearchIndexStats.onDisk', {
                  size: server.bytesOnDisk,
                }),
                t(atRestKeys[server.atRest]),
              ].join(' · ')}
            </Box>
            {server.limitedReason && (
              <Box fontScale='c1' color='hint'>
                {t(limitKeys[server.limitedReason])}
              </Box>
            )}
          </Box>
        </FieldRow>
      ))}
    </Field>
  );
};
