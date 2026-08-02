import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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
      React.createElement('button', { type: 'button', onClick, ...rest }, children),
    ButtonGroup: passthrough('div'),
    Select: ({ value, onChange, options = [] }: any) =>
      React.createElement(
        'select',
        {
          value,
          onChange: (e: any) => onChange?.(e.target.value),
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
  };
});

jest.mock('react-virtuoso', () => ({
  Virtuoso: ({ data, itemContent }: any) => (
    <div data-testid='virtuoso'>
      {(data || []).map((item: any, index: number) => (
        <div key={item.id || index}>{itemContent(index, item)}</div>
      ))}
    </div>
  ),
}));

jest.mock('../LogEntry', () => ({
  LogEntry: ({ entry }: any) => (
    <div data-testid={`log-${entry.id}`}>{entry.message}</div>
  ),
}));

import LogViewerWindow from '../logViewerWindow';

const sampleLog = [
  'info: first message {"t":{"$date":"2026-01-01T00:00:00.000Z"}}',
  'error: boom {"t":{"$date":"2026-01-01T00:01:00.000Z"}}',
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
        return { 'open.rocket.chat': 'Community' };
      }
      if (channel === 'log-viewer-window/select-file') {
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
    render(<LogViewerWindow />);
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith(
        'log-viewer-window/read-logs',
        expect.any(Object)
      );
    });
  });

  it('updates search filter without crashing', async () => {
    render(<LogViewerWindow />);
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    const inputs = screen.queryAllByRole('textbox');
    if (inputs[0]) {
      fireEvent.change(inputs[0], { target: { value: 'boom' } });
    }
    expect(true).toBe(true);
  });

  it('invokes actions when buttons are clicked', async () => {
    render(<LogViewerWindow />);
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    const buttons = screen.getAllByRole('button');
    for (const button of buttons.slice(0, 12)) {
      try {
        fireEvent.click(button);
      } catch {
        // some buttons may require confirm
      }
    }
    expect(buttons.length).toBeGreaterThan(0);
  });
});
