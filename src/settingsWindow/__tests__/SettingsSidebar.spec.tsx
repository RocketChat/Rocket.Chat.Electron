import { fireEvent } from '@testing-library/react';

import { invoke } from '../../ipc/renderer';
import { renderWithStore, screen, within } from '../../ui/test-utils';
import { NavRow } from '../../ui/windowChrome/NavRow';
import type { Surfaces } from '../../ui/windowChrome/appearance';
import {
  SETTINGS_TABPANEL_ID,
  SettingsSidebar,
  settingsSectionTabId,
} from '../SettingsSidebar';
import { SettingsWindow } from '../SettingsWindow';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
}));

jest.mock('../../ipc/renderer', () => ({
  invoke: jest.fn(),
}));

const invokeMock = invoke as jest.MockedFunction<typeof invoke>;

jest.mock('../sections', () => ({
  SETTINGS_SECTIONS: [
    {
      id: 'general',
      icon: 'cog',
      labelKey: 'settings.general',
      settingKeys: [],
      Component: () => <div data-testid='section-general'>general</div>,
    },
    {
      id: 'appearance',
      icon: 'palette',
      labelKey: 'settings.appearance',
      settingKeys: [],
      Component: () => <div data-testid='section-appearance'>appearance</div>,
    },
    {
      id: 'advanced',
      icon: 'code',
      labelKey: 'settings.advanced',
      settingKeys: [],
      Component: () => <div data-testid='section-advanced'>advanced</div>,
    },
  ],
}));

const surfaces: Surfaces = {
  panel: '#fff',
  card: '#fff',
  sticky: '#fff',
  field: '#eee',
  hover: '#ddd',
  selected: '#ccc',
  divider: '#000',
};

const sections = [
  { id: 'general', label: 'General', icon: 'cog' as const, matches: [] },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: 'palette' as const,
    matches: [],
  },
  { id: 'advanced', label: 'Advanced', icon: 'code' as const, matches: [] },
];

const renderSidebar = (currentSection: string, onSelectSection = jest.fn()) => {
  renderWithStore(
    <SettingsSidebar
      surfaces={surfaces}
      sections={sections}
      currentSection={currentSection}
      onSelectSection={onSelectSection}
      searchFilter=''
      onSearchFilterChange={jest.fn()}
    />
  );
  return { onSelectSection };
};

describe('SettingsSidebar tabs contract', () => {
  it('exposes a vertical tablist with roving tabindex and panel controls', () => {
    renderSidebar('appearance');

    expect(screen.getByRole('tablist')).toHaveAttribute(
      'aria-orientation',
      'vertical'
    );

    const general = screen.getByRole('tab', { name: 'General' });
    const appearance = screen.getByRole('tab', { name: 'Appearance' });
    const advanced = screen.getByRole('tab', { name: 'Advanced' });

    expect(general).toHaveAttribute('tabIndex', '-1');
    expect(appearance).toHaveAttribute('tabIndex', '0');
    expect(advanced).toHaveAttribute('tabIndex', '-1');

    expect(general).toHaveAttribute('aria-selected', 'false');
    expect(appearance).toHaveAttribute('aria-selected', 'true');

    expect(general).toHaveAttribute('id', settingsSectionTabId('general'));
    expect(appearance).toHaveAttribute('aria-controls', SETTINGS_TABPANEL_ID);
    expect(advanced).toHaveAttribute('aria-controls', SETTINGS_TABPANEL_ID);
  });

  it('moves selection with ArrowUp/ArrowDown', () => {
    const { onSelectSection } = renderSidebar('appearance');
    const tablist = screen.getByRole('tablist');

    fireEvent.keyDown(tablist, { key: 'ArrowDown' });
    expect(onSelectSection).toHaveBeenCalledWith('advanced');

    onSelectSection.mockClear();
    fireEvent.keyDown(tablist, { key: 'ArrowUp' });
    expect(onSelectSection).toHaveBeenCalledWith('general');
  });

  it('wraps ArrowUp from the first row to the last', () => {
    const { onSelectSection } = renderSidebar('general');

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowUp' });

    expect(onSelectSection).toHaveBeenCalledWith('advanced');
  });

  it('wraps ArrowDown from the last row to the first', () => {
    const { onSelectSection } = renderSidebar('advanced');

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowDown' });

    expect(onSelectSection).toHaveBeenCalledWith('general');
  });

  it('jumps to the first and last rows with Home and End', () => {
    const { onSelectSection } = renderSidebar('appearance');
    const tablist = screen.getByRole('tablist');

    fireEvent.keyDown(tablist, { key: 'Home' });
    expect(onSelectSection).toHaveBeenCalledWith('general');

    onSelectSection.mockClear();
    fireEvent.keyDown(tablist, { key: 'End' });
    expect(onSelectSection).toHaveBeenCalledWith('advanced');
  });

  it('prevents default on vertical tab keys so the list does not scroll', () => {
    renderSidebar('general');
    const tablist = screen.getByRole('tablist');
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });

    expect(tablist.dispatchEvent(event)).toBe(false);
  });

  it('focuses the destination row after a keyboard move', () => {
    renderSidebar('general');
    screen.getByRole('tab', { name: 'General' }).focus();

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowDown' });

    expect(screen.getByRole('tab', { name: 'Appearance' })).toHaveFocus();
  });
});

describe('NavRow selected weight', () => {
  it('pairs the selected fill with fontScale p2b and leaves unselected at p2', () => {
    renderWithStore(
      <>
        <NavRow
          label='Selected'
          isSelected
          surfaces={surfaces}
          onSelect={jest.fn()}
        />
        <NavRow
          label='Idle'
          isSelected={false}
          surfaces={surfaces}
          onSelect={jest.fn()}
        />
      </>
    );

    const selectedLabel = within(
      screen.getByRole('tab', { name: 'Selected' })
    ).getByText('Selected');
    const idleLabel = within(
      screen.getByRole('tab', { name: 'Idle' })
    ).getByText('Idle');

    expect(getComputedStyle(selectedLabel).fontWeight).toBe('700');
    expect(getComputedStyle(idleLabel).fontWeight).toBe('400');
    expect(getComputedStyle(selectedLabel).color).toBe(
      getComputedStyle(idleLabel).color
    );
  });
});

describe('SettingsWindow tabpanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
    invokeMock.mockResolvedValue(false as never);
  });

  it('links the selected tab to the content panel', () => {
    renderWithStore(<SettingsWindow paletteTheme='light' />);

    const selected = screen.getByRole('tab', { selected: true });
    const panel = screen.getByRole('tabpanel');

    expect(panel).toHaveAttribute('id', SETTINGS_TABPANEL_ID);
    expect(selected).toHaveAttribute('aria-controls', SETTINGS_TABPANEL_ID);
    expect(panel).toHaveAttribute('aria-labelledby', selected.id);
    expect(selected).toHaveAttribute('id', settingsSectionTabId('general'));
  });
});
