import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';

import type { Surfaces } from '../../ui/windowChrome/appearance';
import { LogEntry } from '../LogEntry';
import type { LogEntryType } from '../types';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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

const baseEntry = (overrides: Partial<LogEntryType> = {}): LogEntryType => ({
  id: '1',
  timestamp: '2026-01-01T00:00:00.000Z',
  level: 'info',
  message: 'hello world',
  contextTags: ['main', 'open.rocket.chat'],
  context: 'main open.rocket.chat',
  raw: 'raw line',
  searchText: 'hello world main open.rocket.chat',
  rawLower: 'raw line',
  ...overrides,
});

const renderEntry = (
  entry: LogEntryType,
  overrides: Partial<ComponentProps<typeof LogEntry>> = {}
) =>
  render(
    <LogEntry
      entry={entry}
      showContext={false}
      showServer={false}
      serverMapping={{}}
      searchTerm=''
      wrapLines
      collapseEnabled
      isExpanded={false}
      onToggleExpanded={jest.fn()}
      onCopy={jest.fn()}
      surfaces={surfaces}
      {...overrides}
    />
  );

describe('LogEntry', () => {
  it('renders message and level', () => {
    renderEntry(baseEntry());
    expect(screen.getByText('hello world')).toBeInTheDocument();
    expect(screen.getByText(/info/i)).toBeInTheDocument();
  });

  it('renders context when enabled', () => {
    renderEntry(
      baseEntry({ contextTags: ['main', 'app'], context: 'main app' }),
      {
        showContext: true,
      }
    );
    expect(screen.getByText(/main/)).toBeInTheDocument();
  });

  it('renders server chip when mapping matches context tag', () => {
    renderEntry(baseEntry(), {
      showContext: true,
      showServer: true,
      serverMapping: { 'open.rocket.chat': 'Community' },
    });
    expect(screen.getByText('Community')).toBeInTheDocument();
  });

  it.each(['error', 'warn', 'info', 'debug', 'verbose'] as const)(
    'renders %s level badge',
    (level) => {
      renderEntry(baseEntry({ level }));
      expect(screen.getByText(new RegExp(level, 'i'))).toBeInTheDocument();
    }
  );
});
