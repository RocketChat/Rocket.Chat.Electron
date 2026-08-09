import { Box, Icon, Scrollable, SearchInput } from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { FilterRow } from '../ui/windowChrome/FilterRow';
import { FilterSection } from '../ui/windowChrome/FilterSection';
import { SIDEBAR_WIDTH } from '../ui/windowChrome/appearance';
import { isFacetSelected } from '../ui/windowChrome/filters';
import { SEARCH_FIELD_CLASS } from '../ui/windowChrome/styles';
import { LEVEL_ACCENT, LOG_LEVELS } from './appearance';
import type { LogLevel } from './types';

export type LogViewerSidebarProps = {
  searchFilter: string;
  onSearchFilterChange: (event: ChangeEvent<HTMLInputElement>) => void;
  levelFilters: LogLevel[];
  /** Levels present in the loaded file — the only ones worth offering. */
  availableLevels: LogLevel[];
  levelCounts: Record<string, number>;
  onToggleLevel: (level: LogLevel) => void;
  contextOptions: string[];
  contextLabels: Record<string, string>;
  contextFilters: string[];
  contextCounts: Record<string, number>;
  onToggleContext: (context: string) => void;
  serverOptions: string[];
  serverLabels: Record<string, string>;
  serverFilters: string[];
  serverCounts: Record<string, number>;
  onToggleServer: (server: string) => void;
  showContext: boolean;
  onToggleShowContext: () => void;
  showServer: boolean;
  onToggleShowServer: () => void;
  wrapLines: boolean;
  onToggleWrapLines: () => void;
  collapseMultiline: boolean;
  onToggleCollapseMultiline: () => void;
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
  showTimeline: boolean;
  onToggleShowTimeline: () => void;
  onSelectAllLevels: () => void;
  onSelectAllContexts: () => void;
  onSelectAllServers: () => void;
};

export const LogViewerSidebar = ({
  searchFilter,
  onSearchFilterChange,
  levelFilters,
  availableLevels,
  levelCounts,
  onToggleLevel,
  contextOptions,
  contextLabels,
  contextFilters,
  contextCounts,
  onToggleContext,
  serverOptions,
  serverLabels,
  serverFilters,
  serverCounts,
  onToggleServer,
  showContext,
  onToggleShowContext,
  showServer,
  onToggleShowServer,
  wrapLines,
  onToggleWrapLines,
  collapseMultiline,
  onToggleCollapseMultiline,
  autoScroll,
  onToggleAutoScroll,
  showTimeline,
  onToggleShowTimeline,
  onSelectAllLevels,
  onSelectAllContexts,
  onSelectAllServers,
}: LogViewerSidebarProps) => {
  const { t } = useTranslation();
  const selectAllLabel = t('logViewer.filters.selectAll');

  return (
    <Box
      is='aside'
      display='flex'
      flexDirection='column'
      aria-label={t('logViewer.sidebar.title')}
      style={{
        width: `${SIDEBAR_WIDTH}px`,
        flex: `0 0 ${SIDEBAR_WIDTH}px`,
        minHeight: 0,
      }}
    >
      <Box padding='x12' paddingBlockEnd='x8' className={SEARCH_FIELD_CLASS}>
        <SearchInput
          addon={<Icon name='magnifier' size='x20' />}
          aria-label={t('logViewer.placeholders.searchLogs')}
          placeholder={t('logViewer.placeholders.searchLogs')}
          value={searchFilter}
          onChange={onSearchFilterChange}
        />
      </Box>

      <Box flexGrow={1} style={{ minHeight: 0 }}>
        <Scrollable vertical>
          <Box paddingInline='x12' paddingBlockEnd='x12' height='100%'>
            <FilterSection
              title={t('logViewer.sidebar.levels')}
              selectAllLabel={selectAllLabel}
              canSelectAll={levelFilters.length > 0}
              onSelectAll={onSelectAllLevels}
            >
              {(availableLevels.length > 0 ? availableLevels : LOG_LEVELS).map(
                (level) => (
                  <FilterRow
                    key={level}
                    label={t(`logViewer.filters.level.${level}`)}
                    count={levelCounts[level] ?? 0}
                    checked={isFacetSelected(levelFilters, level)}
                    accent={LEVEL_ACCENT[level]}
                    onToggle={() => onToggleLevel(level)}
                  />
                )
              )}
            </FilterSection>

            {contextOptions.length > 0 && (
              <FilterSection
                title={t('logViewer.sidebar.contexts')}
                selectAllLabel={selectAllLabel}
                canSelectAll={contextFilters.length > 0}
                onSelectAll={onSelectAllContexts}
              >
                {contextOptions.map((context) => (
                  <FilterRow
                    key={context}
                    label={contextLabels[context] ?? context}
                    title={context}
                    count={contextCounts[context] ?? 0}
                    checked={isFacetSelected(contextFilters, context)}
                    onToggle={() => onToggleContext(context)}
                  />
                ))}
              </FilterSection>
            )}

            {serverOptions.length > 0 && (
              <FilterSection
                title={t('logViewer.sidebar.servers')}
                selectAllLabel={selectAllLabel}
                canSelectAll={serverFilters.length > 0}
                onSelectAll={onSelectAllServers}
              >
                {serverOptions.map((server) => (
                  <FilterRow
                    key={server}
                    label={serverLabels[server] ?? server}
                    title={server}
                    count={serverCounts[server] ?? 0}
                    checked={isFacetSelected(serverFilters, server)}
                    onToggle={() => onToggleServer(server)}
                  />
                ))}
              </FilterSection>
            )}

            <FilterSection title={t('logViewer.sidebar.display')}>
              <FilterRow
                label={t('logViewer.controls.showContext')}
                checked={showContext}
                onToggle={onToggleShowContext}
              />
              <FilterRow
                label={t('logViewer.controls.showServer')}
                checked={showServer}
                onToggle={onToggleShowServer}
              />
              <FilterRow
                label={t('logViewer.controls.wrapLines')}
                checked={wrapLines}
                onToggle={onToggleWrapLines}
              />
              <FilterRow
                label={t('logViewer.controls.collapseMultiline')}
                checked={collapseMultiline}
                onToggle={onToggleCollapseMultiline}
              />
              <FilterRow
                label={t('logViewer.controls.autoScrollToTop')}
                checked={autoScroll}
                onToggle={onToggleAutoScroll}
              />
              <FilterRow
                label={t('logViewer.controls.showTimeline')}
                checked={showTimeline}
                onToggle={onToggleShowTimeline}
              />
            </FilterSection>
          </Box>
        </Scrollable>
      </Box>
    </Box>
  );
};
