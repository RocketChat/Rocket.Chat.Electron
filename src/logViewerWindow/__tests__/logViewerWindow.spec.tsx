import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// eslint-disable-next-line import/first
import LogViewerWindow from '../logViewerWindow';

const invoke = jest.fn();
const on = jest.fn();
const removeListener = jest.fn();

jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: (...args: any[]) => invoke(...args),
    on: (...args: any[]) => on(...args),
    removeListener: (...args: any[]) => removeListener(...args),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue || key,
  }),
}));

jest.mock('@rocket.chat/fuselage-hooks', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  return {
    useLocalStorage: (_key: string, initial: any) => React.useState(initial),
    useDebouncedValue: (value: any) => value,
    useMergedRefs: () => jest.fn(),
    useResizeObserver: () => ({ ref: jest.fn(), contentBoxSize: {} }),
    useUniqueId: () => 'id',
    useEffectEvent: (fn: any) => fn,
    useAutoFocus: () => jest.fn(),
  };
});

// Light fuselage stubs so Select/SearchInput don't need full hooks
jest.mock('@rocket.chat/fuselage', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  const passthrough =
    (tag = 'div') =>
    ({ children, ...props }: any) =>
      React.createElement(tag, props, children);

  return {
    Box: passthrough('div'),
    SearchInput: ({ value, onChange, placeholder, ...rest }: any) =>
      React.createElement('input', {
        value,
        onChange,
        placeholder,
        'aria-label': placeholder || 'search',
        ...rest,
      }),
    Icon: () => null,
    Button: ({ children, onClick, ...rest }: any) =>
      React.createElement(
        'button',
        { type: 'button', onClick, ...rest },
        children
      ),
    ButtonGroup: passthrough('div'),
    Select: ({ value, onChange, options = [] }: any) =>
      React.createElement(
        'select',
        {
          value,
          'onChange': (e: any) => onChange?.(e.target.value),
          'aria-label': 'select',
        },
        options.map(([val, label]: [string, string]) =>
          React.createElement('option', { key: val, value: val }, label)
        )
      ),
    Tile: passthrough('div'),
    Throbber: () => React.createElement('div', { role: 'progressbar' }),
    CheckBox: ({ checked, onChange, ...rest }: any) =>
      React.createElement('input', {
        type: 'checkbox',
        checked,
        onChange,
        ...rest,
      }),
    Callout: passthrough('div'),
    IconButton: ({ onClick, title, ...rest }: any) =>
      React.createElement('button', {
        'type': 'button',
        onClick,
        'aria-label': title,
        ...rest,
      }),
    States: passthrough('div'),
    StatesAction: ({ children, onClick, ...rest }: any) =>
      React.createElement(
        'button',
        { type: 'button', onClick, ...rest },
        children
      ),
    StatesActions: passthrough('div'),
    StatesIcon: () => null,
    StatesSubtitle: passthrough('div'),
    StatesTitle: passthrough('div'),
  };
});

jest.mock('react-virtuoso', () => ({
  GroupedVirtuoso: ({ data, itemContent }: any) => (
    <div data-testid='virtuoso'>
      {(data || []).map((item: any, index: number) => (
        <div key={item.id || index}>{itemContent(index, 0, item)}</div>
      ))}
    </div>
  ),
}));

jest.mock('../LogEntry', () => ({
  LogEntry: ({ entry }: any) => (
    <div data-testid={`log-${entry.id}`}>{entry.message}</div>
  ),
}));

jest.mock('../LogViewerToolbar', () => ({
  LogViewerToolbar: ({ onRefresh }: { onRefresh: () => void }) => (
    <button type='button' onClick={onRefresh}>
      logViewer.buttons.refresh
    </button>
  ),
}));

jest.mock('../LogViewerSidebar', () => ({
  LogViewerSidebar: ({
    searchFilter,
    onSearchFilterChange,
  }: {
    searchFilter: string;
    onSearchFilterChange: (event: { target: { value: string } }) => void;
  }) => (
    <input
      aria-label='search'
      value={searchFilter}
      onChange={onSearchFilterChange}
    />
  ),
}));

jest.mock('../LogTimeline', () => ({
  LogTimeline: () => null,
}));

jest.mock('../LogStatusBar', () => ({
  LogStatusBar: () => null,
}));

jest.mock('../../ui/windowChrome/styles', () => ({
  WindowChromeGlobalStyles: () => null,
}));

jest.mock('../styles', () => ({
  LogViewerGlobalStyles: () => null,
}));

jest.mock('../../ui/windowChrome/useTransparency', () => ({
  useTransparency: () => false,
}));

jest.mock('../../ui/windowChrome/useCopiedFeedback', () => ({
  useCopiedFeedback: () => [false, jest.fn()],
}));

jest.mock('../../ui/components/utils/TooltipProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: unknown }) => children,
}));

const sampleLog = [
  '[2026-01-01T00:00:00.000Z] [info] first message',
  '[2026-01-01T00:01:00.000Z] [error] boom',
].join('\n');

describe('LogViewerWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invoke.mockImplementation(async (channel: string) => {
      if (channel === 'log-viewer-window/read-logs') {
        return {
          success: true,
          logs: sampleLog,
          filePath: '/tmp/main.log',
          fileName: 'main.log',
          isDefaultLog: true,
          totalEntriesInFile: 2,
          lastModifiedTime: Date.now(),
        };
      }
      if (channel === 'log-viewer-window/get-server-mapping') {
        return { success: true, mapping: { 'open.rocket.chat': 'Community' } };
      }
      if (channel === 'log-viewer-window/select-log-file') {
        return {
          success: true,
          filePath: '/tmp/other.log',
          fileName: 'other.log',
          canceled: false,
        };
      }
      if (channel === 'log-viewer-window/save-logs') {
        return { success: true };
      }
      if (channel === 'log-viewer-window/clear-logs') {
        return { success: true };
      }
      if (channel === 'log-viewer-window/read-logs-tail') {
        return { success: true, logs: '', hasNew: false };
      }
      return { success: true };
    });
  });

  it('loads and renders log entries', async () => {
    render(<LogViewerWindow paletteTheme='light' />);
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith(
        'log-viewer-window/read-logs',
        expect.any(Object)
      );
    });
  });

  it('filters rendered entries by the search term', async () => {
    render(<LogViewerWindow paletteTheme='light' />);
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByTestId(/^log-/)).toHaveLength(2));

    const searchInput = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(searchInput, { target: { value: 'boom' } });

    await waitFor(() => expect(screen.getAllByTestId(/^log-/)).toHaveLength(1));
    expect(screen.getByTestId(/^log-/)).toHaveTextContent('boom');
  });

  it('invokes the refresh IPC channel when the refresh button is clicked', async () => {
    render(<LogViewerWindow paletteTheme='light' />);
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    invoke.mockClear();

    fireEvent.click(
      screen.getByRole('button', { name: 'logViewer.buttons.refresh' })
    );

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith(
        'log-viewer-window/read-logs',
        expect.any(Object)
      )
    );
  });
});
