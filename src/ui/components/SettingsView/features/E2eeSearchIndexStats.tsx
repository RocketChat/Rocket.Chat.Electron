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

// While the view is shown, the stats are asked for again at this rate, so the
// count follows the indexing of the web client.
export const E2EE_SEARCH_INDEX_STATS_REFRESH_MS = 5_000;

// The local search index of encrypted messages, for each server: how many
// messages it holds, how much disk it takes, and whether it is encrypted on
// disk. The main process collects it when Settings asks.
export const E2eeSearchIndexStats = (props: E2eeSearchIndexStatsProps) => {
  const { t } = useTranslation();
  const stats = useSelector(
    ({ e2eeSearchIndexStats }: RootState) => e2eeSearchIndexStats
  );

  useEffect(() => {
    const request = () =>
      dispatch({ type: SETTINGS_E2EE_SEARCH_INDEX_STATS_REQUESTED });
    request();
    const timer = setInterval(request, E2EE_SEARCH_INDEX_STATS_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  // A closed index is an encrypted snapshot, so its count is known only
  // after the workspace opens it. The index of a removed server never opens
  // again, so its line has no count.
  const countOf = (server: E2EESearchServerIndexStats) => {
    if (server.docs !== undefined) {
      return t('settings.options.e2eeSearchIndexStats.messages', {
        count: server.docs,
      });
    }
    return server.serverUrl
      ? t('settings.options.e2eeSearchIndexStats.countWhenOpen')
      : undefined;
  };

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
                countOf(server),
                t('settings.options.e2eeSearchIndexStats.onDisk', {
                  size: server.bytesOnDisk,
                }),
                t(atRestKeys[server.atRest]),
              ]
                .filter(Boolean)
                .join(' · ')}
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
