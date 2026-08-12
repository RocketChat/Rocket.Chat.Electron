import { fireEvent } from '@testing-library/react';

import { invoke } from '../../ipc/renderer';
import {
  renderWithStore,
  screen,
  userEvent,
  waitFor,
} from '../../ui/test-utils';
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

// Stubs sections cheaply so this spec exercises only the section-selection
// logic, not each section's own dependencies.
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
  ],
}));

const LOCAL_STORAGE_KEY = 'fuselage-localStorage-settings-window/section';

const seedPersistedSection = (id: string): void => {
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(id));
};

describe('SettingsWindow section selection', () => {
  beforeEach(() => {
    window.localStorage.clear();
    invokeMock.mockResolvedValue(false as never);
  });

  it('renders the persisted section on open', () => {
    seedPersistedSection('appearance');

    renderWithStore(<SettingsWindow paletteTheme='light' />);

    expect(screen.getByTestId('section-appearance')).toBeInTheDocument();
  });

  it('temporarily shows the first search match without persisting it, and restores the persisted section once the search clears', async () => {
    seedPersistedSection('appearance');

    renderWithStore(<SettingsWindow paletteTheme='light' />);
    expect(screen.getByTestId('section-appearance')).toBeInTheDocument();

    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'general' } });

    await waitFor(() =>
      expect(screen.getByTestId('section-general')).toBeInTheDocument()
    );
    // The override must never overwrite the persisted value.
    expect(
      JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) ?? '""')
    ).toBe('appearance');

    fireEvent.change(searchInput, { target: { value: '' } });

    await waitFor(() =>
      expect(screen.getByTestId('section-appearance')).toBeInTheDocument()
    );
  });

  it('persists the section when the user explicitly selects one', async () => {
    seedPersistedSection('general');
    const user = userEvent.setup();

    renderWithStore(<SettingsWindow paletteTheme='light' />);
    expect(screen.getByTestId('section-general')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'settings.appearance' }));

    expect(screen.getByTestId('section-appearance')).toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) ?? '""')
    ).toBe('appearance');
  });
});
