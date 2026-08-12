import { Box, Icon, Scrollable } from '@rocket.chat/fuselage';
import { useLocalStorage } from '@rocket.chat/fuselage-hooks';
import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import TooltipProvider from '../ui/components/utils/TooltipProvider';
import { WindowToolbar } from '../ui/windowChrome/WindowToolbar';
import type { PaletteTheme } from '../ui/windowChrome/appearance';
import { getCardStyle, resolveSurfaces } from '../ui/windowChrome/appearance';
import { WindowChromeGlobalStyles } from '../ui/windowChrome/styles';
import { useTransparency } from '../ui/windowChrome/useTransparency';
import {
  SETTINGS_TABPANEL_ID,
  SettingsSidebar,
  settingsSectionTabId,
} from './SettingsSidebar';
import type { SettingsSectionItem } from './SettingsSidebar';
import { TRANSPARENCY_CHANNEL } from './constants';
import { fuzzyMatch, matchesSearchText } from './fuzzy';
import { collectSettingSearchTexts } from './searchIndex';
import { SETTINGS_SECTIONS } from './sections';

const DEFAULT_SECTION = 'general';

type SettingsWindowProps = {
  paletteTheme: PaletteTheme;
};

export const SettingsWindow = ({ paletteTheme }: SettingsWindowProps) => {
  const { t } = useTranslation();
  const isTransparent = useTransparency(TRANSPARENCY_CHANNEL);
  const surfaces = useMemo(
    () => resolveSurfaces(paletteTheme, isTransparent),
    [paletteTheme, isTransparent]
  );
  const cardStyle = useMemo(
    () => getCardStyle(paletteTheme, surfaces),
    [paletteTheme, surfaces]
  );

  const [persistedSection, setPersistedSection] = useLocalStorage(
    'settings-window/section',
    DEFAULT_SECTION
  );
  const [searchFilter, setSearchFilter] = useState('');
  // While a search hides the persisted section, this holds the section shown
  // instead — display-only, so clearing the search restores the persisted one
  // rather than the last search result overwriting it permanently.
  const [searchOverrideSection, setSearchOverrideSection] = useState<
    string | null
  >(null);

  const currentSection = searchOverrideSection ?? persistedSection;

  const setCurrentSection = useCallback(
    (sectionId: string) => {
      setSearchOverrideSection(null);
      setPersistedSection(sectionId);
    },
    [setPersistedSection]
  );

  const handleSearchFilterChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchFilter(event.target.value);
    },
    []
  );

  // Every section is listed: the parts that are developer-only live inside
  // Advanced, which hides them itself.
  const availableSections = SETTINGS_SECTIONS;

  /**
   * A section survives the search if its own name matches, or if any setting it
   * holds does — the matching settings are then named in the row, so it is clear
   * why the section is still listed.
   */
  const visibleSections = useMemo<SettingsSectionItem[]>(() => {
    const query = searchFilter.trim();

    return availableSections
      .map((section) => {
        const label = t(section.labelKey);
        const matches = query
          ? section.settingKeys
              .map((key) => collectSettingSearchTexts(t, key))
              .filter((setting) =>
                setting.texts.some((text) => matchesSearchText(query, text))
              )
              .map((setting) => setting.title)
          : [];

        return {
          id: section.id,
          label,
          icon: section.icon,
          matches,
          isVisible: !query || fuzzyMatch(query, label) || matches.length > 0,
        };
      })
      .filter(({ isVisible }) => isVisible)
      .map(({ isVisible: _isVisible, ...section }) => section);
  }, [availableSections, searchFilter, t]);

  // The section is remembered across opens and can be filtered away by a search,
  // so keep the selection on something that is actually listed — but only for
  // the duration of the search, never persisting the substitution.
  useEffect(() => {
    if (visibleSections.length === 0) return;

    if (visibleSections.some((section) => section.id === persistedSection)) {
      if (searchOverrideSection !== null) setSearchOverrideSection(null);
      return;
    }

    if (
      searchOverrideSection === null ||
      !visibleSections.some((section) => section.id === searchOverrideSection)
    ) {
      setSearchOverrideSection(visibleSections[0].id);
    }
  }, [persistedSection, searchOverrideSection, visibleSections]);

  const ActiveSection = useMemo(
    () =>
      availableSections.find((section) => section.id === currentSection)
        ?.Component,
    [availableSections, currentSection]
  );

  return (
    <TooltipProvider>
      <WindowChromeGlobalStyles
        paletteTheme={paletteTheme}
        surfaces={surfaces}
      />
      <Box
        display='flex'
        flexDirection='column'
        height='100vh'
        width='100%'
        style={{ backgroundColor: surfaces.panel }}
      >
        <WindowToolbar>
          <Icon name='cog' size='x16' color='hint' />
          <Box
            marginInlineStart='x4'
            fontScale='p2b'
            color='default'
            withTruncatedText
          >
            {t('settings.title')}
          </Box>
        </WindowToolbar>

        <Box
          display='flex'
          flexDirection='row'
          flexGrow={1}
          style={{ minHeight: 0 }}
        >
          <SettingsSidebar
            surfaces={surfaces}
            sections={visibleSections}
            currentSection={currentSection}
            onSelectSection={setCurrentSection}
            searchFilter={searchFilter}
            onSearchFilterChange={handleSearchFilterChange}
          />

          <Box
            id={SETTINGS_TABPANEL_ID}
            role='tabpanel'
            aria-labelledby={settingsSectionTabId(currentSection)}
            flexGrow={1}
            display='flex'
            flexDirection='column'
            style={{ minWidth: 0, minHeight: 0, ...cardStyle }}
          >
            <Scrollable vertical>
              <Box padding='x24' style={{ maxWidth: '640px' }}>
                {ActiveSection && <ActiveSection surfaces={surfaces} />}
              </Box>
            </Scrollable>
          </Box>
        </Box>
      </Box>
    </TooltipProvider>
  );
};
