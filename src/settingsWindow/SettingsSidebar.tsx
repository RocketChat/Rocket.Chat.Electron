import { Box, Icon, Scrollable, SearchInput } from '@rocket.chat/fuselage';
import type { Keys as IconName } from '@rocket.chat/icons';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { NavRow } from '../ui/windowChrome/NavRow';
import type { Surfaces } from '../ui/windowChrome/appearance';
import { SIDEBAR_WIDTH } from '../ui/windowChrome/appearance';
import { SEARCH_FIELD_CLASS } from '../ui/windowChrome/styles';

export type SettingsSectionItem = {
  id: string;
  label: string;
  icon: IconName;
  /** Settings inside this section that the query matched, if any. */
  matches: string[];
};

export type SettingsSidebarProps = {
  surfaces: Surfaces;
  sections: SettingsSectionItem[];
  currentSection: string;
  onSelectSection: (id: string) => void;
  searchFilter: string;
  onSearchFilterChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export const SettingsSidebar = ({
  surfaces,
  sections,
  currentSection,
  onSelectSection,
  searchFilter,
  onSearchFilterChange,
}: SettingsSidebarProps) => {
  const { t } = useTranslation();

  return (
    <Box
      is='aside'
      display='flex'
      flexDirection='column'
      aria-label={t('settings.title')}
      style={{
        width: `${SIDEBAR_WIDTH}px`,
        flex: `0 0 ${SIDEBAR_WIDTH}px`,
        minHeight: 0,
      }}
    >
      <Box padding='x12' paddingBlockEnd='x8' className={SEARCH_FIELD_CLASS}>
        <SearchInput
          addon={<Icon name='magnifier' size='x20' />}
          aria-label={t('settings.search')}
          placeholder={t('settings.search')}
          value={searchFilter}
          onChange={onSearchFilterChange}
        />
      </Box>

      <Box flexGrow={1} style={{ minHeight: 0 }} role='tablist'>
        <Scrollable vertical>
          <Box paddingInline='x12' paddingBlockEnd='x12' height='100%'>
            {sections.length === 0 ? (
              <Box paddingBlock='x8' fontScale='c1' color='hint'>
                {t('settings.noResults')}
              </Box>
            ) : (
              sections.map((section) => (
                <NavRow
                  key={section.id}
                  label={section.label}
                  icon={section.icon}
                  // Why the section matched, when it was not the name itself.
                  description={section.matches.join(' · ') || undefined}
                  isSelected={section.id === currentSection}
                  surfaces={surfaces}
                  onSelect={() => onSelectSection(section.id)}
                />
              ))
            )}
          </Box>
        </Scrollable>
      </Box>
    </Box>
  );
};
