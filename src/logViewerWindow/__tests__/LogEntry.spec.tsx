import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import { LogEntry } from '../LogEntry';
import type { LogEntryType } from '../types';

const baseEntry = (overrides: Partial<LogEntryType> = {}): LogEntryType => ({
  id: '1',
  timestamp: '2026-01-01T00:00:00.000Z',
  level: 'info',
  message: 'hello world',
  context: 'main open.rocket.chat',
  raw: 'raw line',
  ...overrides,
});

describe('LogEntry', () => {
  it('renders message and level', () => {
    render(
      <LogEntry
        entry={baseEntry()}
        showContext={false}
        showServer={false}
        serverMapping={{}}
      />
    );
    expect(screen.getByText('hello world')).toBeInTheDocument();
    expect(screen.getByText(/info/i)).toBeInTheDocument();
  });

  it('renders context when enabled', () => {
    render(
      <LogEntry
        entry={baseEntry({ context: 'main [app]' })}
        showContext
        showServer={false}
        serverMapping={{}}
      />
    );
    expect(screen.getByText(/main/)).toBeInTheDocument();
  });

  it('renders server chip when mapping matches context tag', () => {
    render(
      <LogEntry
        entry={baseEntry({ context: 'main open.rocket.chat' })}
        showContext
        showServer
        serverMapping={{ 'open.rocket.chat': 'Community' }}
      />
    );
    expect(screen.getByText('Community')).toBeInTheDocument();
  });

  it.each(['error', 'warn', 'info', 'debug', 'verbose'] as const)(
    'renders %s level badge',
    (level) => {
      render(
        <LogEntry
          entry={baseEntry({ level })}
          showContext={false}
          showServer={false}
          serverMapping={{}}
        />
      );
      expect(screen.getByText(new RegExp(level, 'i'))).toBeInTheDocument();
    }
  );
});
