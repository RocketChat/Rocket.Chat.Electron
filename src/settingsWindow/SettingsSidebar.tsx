import { Box, Icon, Scrollable, SearchInput } from '@rocket.chat/fuselage';
import type { Keys as IconName } from '@rocket.chat/icons';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import packageJson from '../../package.json';
import type { RootState } from '../store/rootReducer';
import { NavRow } from '../ui/windowChrome/NavRow';
import type { Surfaces } from '../ui/windowChrome/appearance';
import { SIDEBAR_WIDTH } from '../ui/windowChrome/appearance';
import { SEARCH_FIELD_CLASS } from '../ui/windowChrome/styles';
import { useFindShortcut } from '../ui/windowChrome/useFindShortcut';

export const SETTINGS_TABPANEL_ID = 'settings-section-panel';

export const settingsSectionTabId = (sectionId: string): string =>
  `settings-section-tab-${sectionId}`;

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
  const searchFieldRef = useRef<HTMLDivElement>(null);
  useFindShortcut(searchFieldRef);

  const appVersion = useSelector(({ appVersion }: RootState) => appVersion);

  const handleTabListKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (sections.length === 0) {
        return;
      }

      const currentIndex = Math.max(
        0,
        sections.findIndex((section) => section.id === currentSection)
      );

      let nextIndex: number | null = null;

      switch (event.key) {
        case 'ArrowUp':
          nextIndex =
            currentIndex <= 0 ? sections.length - 1 : currentIndex - 1;
          break;
        case 'ArrowDown':
          nextIndex =
            currentIndex === sections.length - 1 ? 0 : currentIndex + 1;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = sections.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      const nextSection = sections[nextIndex];
      if (!nextSection) {
        return;
      }

      if (nextSection.id !== currentSection) {
        onSelectSection(nextSection.id);
      }

      const tabs =
        event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]');
      tabs[nextIndex]?.focus();
    },
    [currentSection, onSelectSection, sections]
  );

  // Straight from package.json rather than through `packageJsonInformation`:
  // that module is main-process only, and importing it here would pull
  // child_process and the root window into the settings bundle.
  const copyright = `© 2016-${new Date().getFullYear()}, ${
    packageJson.productName
  }`;

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
      <Box
        ref={searchFieldRef}
        padding='x12'
        paddingBlockEnd='x8'
        className={SEARCH_FIELD_CLASS}
      >
        <SearchInput
          addon={<Icon name='magnifier' size='x20' />}
          aria-label={t('settings.search')}
          placeholder={t('settings.search')}
          value={searchFilter}
          onChange={onSearchFilterChange}
        />
      </Box>

      <Box
        flexGrow={1}
        style={{ minHeight: 0 }}
        role='tablist'
        aria-orientation='vertical'
        onKeyDown={handleTabListKeyDown}
      >
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
                  id={settingsSectionTabId(section.id)}
                  controlsId={SETTINGS_TABPANEL_ID}
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

      {/*
        Signature at the foot of the window rather than a setting of its own:
        worth being able to find and copy, not worth a row. The labels are
        dropped — a version number and a copyright line read as themselves.
      */}
      <Box
        paddingInline='x12'
        paddingBlock='x8'
        fontScale='micro'
        color='annotation'
        style={{ userSelect: 'text', textAlign: 'center' }}
      >
        <Box withTruncatedText>{appVersion}</Box>
        <Box withTruncatedText>{copyright}</Box>
      </Box>
    </Box>
  );
};
