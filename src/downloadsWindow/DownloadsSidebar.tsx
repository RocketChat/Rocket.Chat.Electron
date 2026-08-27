import { Box, Icon, Scrollable, SearchInput } from '@rocket.chat/fuselage';
import type { ChangeEvent } from 'react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { FilterRow } from '../ui/windowChrome/FilterRow';
import { FilterSection } from '../ui/windowChrome/FilterSection';
import { SidebarPlaceholder } from '../ui/windowChrome/SidebarPlaceholder';
import { SIDEBAR_WIDTH } from '../ui/windowChrome/appearance';
import type { FacetSelection } from '../ui/windowChrome/filters';
import { isFacetNarrowed, isFacetSelected } from '../ui/windowChrome/filters';
import { SEARCH_FIELD_CLASS } from '../ui/windowChrome/styles';
import { useFindShortcut } from '../ui/windowChrome/useFindShortcut';

export type FacetOption = {
  value: string;
  label: string;
  title?: string;
};

export type DownloadsSidebarProps = {
  searchFilter: string;
  onSearchFilterChange: (event: ChangeEvent<HTMLInputElement>) => void;
  serverOptions: FacetOption[];
  serverFilters: FacetSelection;
  serverCounts: Record<string, number>;
  onToggleServer: (server: string) => void;
  typeOptions: FacetOption[];
  typeFilters: FacetSelection;
  typeCounts: Record<string, number>;
  onToggleType: (mimeType: string) => void;
  statusOptions: FacetOption[];
  statusFilters: FacetSelection;
  statusCounts: Record<string, number>;
  onToggleStatus: (status: string) => void;
  onSelectAllServers: () => void;
  onSelectAllTypes: () => void;
  onSelectAllStatuses: () => void;
};

export const DownloadsSidebar = ({
  searchFilter,
  onSearchFilterChange,
  serverOptions,
  serverFilters,
  serverCounts,
  onToggleServer,
  typeOptions,
  typeFilters,
  typeCounts,
  onToggleType,
  statusOptions,
  statusFilters,
  statusCounts,
  onToggleStatus,
  onSelectAllServers,
  onSelectAllTypes,
  onSelectAllStatuses,
}: DownloadsSidebarProps) => {
  const { t } = useTranslation();
  const searchFieldRef = useRef<HTMLDivElement>(null);
  useFindShortcut(searchFieldRef);
  const selectAllLabel = t('downloads.filters.selectAll');
  const hasFacets =
    statusOptions.length > 0 ||
    typeOptions.length > 0 ||
    serverOptions.length > 0;

  return (
    <Box
      is='aside'
      display='flex'
      flexDirection='column'
      aria-label={t('downloads.sidebar.title')}
      style={{
        width: `${SIDEBAR_WIDTH}px`,
        flex: `0 0 ${SIDEBAR_WIDTH}px`,
        minHeight: 0,
      }}
    >
      <Box
        ref={searchFieldRef}
        padding='x12'
        paddingBlockEnd='x8'
        className={SEARCH_FIELD_CLASS}
      >
        <SearchInput
          addon={<Icon name='magnifier' size='x20' />}
          aria-label={t('downloads.filters.search')}
          placeholder={t('downloads.filters.search')}
          value={searchFilter}
          onChange={onSearchFilterChange}
        />
      </Box>

      <Box flexGrow={1} style={{ minHeight: 0 }}>
        <Scrollable vertical>
          <Box paddingInline='x12' paddingBlockEnd='x12' height='100%'>
            {!hasFacets && (
              <SidebarPlaceholder icon='customize'>
                {t('downloads.filters.empty')}
              </SidebarPlaceholder>
            )}

            {statusOptions.length > 0 && (
              <FilterSection
                title={t('downloads.filters.status')}
                selectAllLabel={selectAllLabel}
                canSelectAll={isFacetNarrowed(statusFilters)}
                onSelectAll={onSelectAllStatuses}
              >
                {statusOptions.map((option) => (
                  <FilterRow
                    key={option.value}
                    label={option.label}
                    count={statusCounts[option.value] ?? 0}
                    checked={isFacetSelected(statusFilters, option.value)}
                    onToggle={() => onToggleStatus(option.value)}
                  />
                ))}
              </FilterSection>
            )}

            {typeOptions.length > 0 && (
              <FilterSection
                title={t('downloads.filters.mimeType')}
                selectAllLabel={selectAllLabel}
                canSelectAll={isFacetNarrowed(typeFilters)}
                onSelectAll={onSelectAllTypes}
              >
                {typeOptions.map((option) => (
                  <FilterRow
                    key={option.value}
                    label={option.label}
                    count={typeCounts[option.value] ?? 0}
                    checked={isFacetSelected(typeFilters, option.value)}
                    onToggle={() => onToggleType(option.value)}
                  />
                ))}
              </FilterSection>
            )}

            {serverOptions.length > 0 && (
              <FilterSection
                title={t('downloads.filters.server')}
                selectAllLabel={selectAllLabel}
                canSelectAll={isFacetNarrowed(serverFilters)}
                onSelectAll={onSelectAllServers}
              >
                {serverOptions.map((option) => (
                  <FilterRow
                    key={option.value}
                    label={option.label}
                    title={option.title}
                    count={serverCounts[option.value] ?? 0}
                    checked={isFacetSelected(serverFilters, option.value)}
                    onToggle={() => onToggleServer(option.value)}
                  />
                ))}
              </FilterSection>
            )}
          </Box>
        </Scrollable>
      </Box>
    </Box>
  );
};
