import '@testing-library/jest-dom';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import { ScreenSharePicker } from '../screenSharePicker';

const invoke = jest.fn();
const send = jest.fn();

jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: (...args: any[]) => invoke(...args),
    send: (...args: any[]) => send(...args),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../ui/components/Dialog', () => ({
  Dialog: ({ isVisible, onClose, children }: any) =>
    isVisible ? (
      <div data-testid='dialog'>
        <button type='button' onClick={onClose}>
          dialog-close
        </button>
        {children}
      </div>
    ) : null,
}));

jest.mock('@rocket.chat/fuselage', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  const passthrough =
    (tag = 'div') =>
    ({ children, onClick, ...props }: any) =>
      React.createElement(tag, { onClick, ...props }, children);
  const Tabs = ({ children }: any) => <div>{children}</div>;
  Tabs.Item = ({ children, onClick, selected }: any) => (
    <button type='button' data-selected={selected} onClick={onClick}>
      {children}
    </button>
  );
  return {
    Box: passthrough('div'),
    Button: ({ children, onClick, disabled, ...rest }: any) => (
      <button type='button' onClick={onClick} disabled={disabled} {...rest}>
        {children}
      </button>
    ),
    Callout: ({ children, title }: any) => (
      <div>
        <strong>{title}</strong>
        {children}
      </div>
    ),
    Label: passthrough('label'),
    Tabs,
    Scrollable: passthrough('div'),
    PaletteStyleTag: () => null,
  };
});

const sources = [
  {
    id: 'screen:0:0',
    name: 'Entire Screen',
    thumbnail: {
      isEmpty: () => false,
      toDataURL: () => 'data:image/png;base64,aaa',
    },
  },
  {
    id: 'window:1:0',
    name: 'Chrome',
    thumbnail: {
      isEmpty: () => false,
      toDataURL: () => 'data:image/png;base64,bbb',
    },
  },
];

describe('ScreenSharePicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invoke.mockImplementation(async (channel: string) => {
      if (channel === 'desktop-capturer-get-sources') return sources;
      if (channel.includes('permission')) return true;
      return undefined;
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('mounts, shows sources, selects, and shares', async () => {
    let setVisible: ((v: boolean) => void) | undefined;
    render(
      <ScreenSharePicker
        onMounted={(fn) => {
          setVisible = fn;
        }}
      />
    );

    await act(async () => {
      setVisible?.(true);
    });

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith(
        'desktop-capturer-get-sources',
        expect.any(Array)
      );
    });

    fireEvent.click(screen.getByText('screenSharing.applicationWindow'));
    fireEvent.click(screen.getByText('screenSharing.entireScreen'));

    const screenTile = await screen.findByText('Entire Screen');
    fireEvent.click(screenTile);

    const share = screen.getByRole('button', { name: 'screenSharing.share' });
    expect(share).toBeEnabled();
    fireEvent.click(share);
    expect(send).toHaveBeenCalledWith(
      'video-call-window/screen-sharing-source-responded',
      'screen:0:0'
    );

    // Always close to exercise cancel path cleanup
    await act(async () => {
      setVisible?.(false);
    });
  });

  it('sends null on dialog close without selection', async () => {
    let setVisible: ((v: boolean) => void) | undefined;
    render(
      <ScreenSharePicker
        onMounted={(fn) => {
          setVisible = fn;
        }}
        responseChannel='custom-response'
      />
    );
    await act(async () => {
      setVisible?.(true);
    });
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    fireEvent.click(screen.getByText('dialog-close'));
    expect(send).toHaveBeenCalledWith('custom-response', null);
  });

  it('shows permission denied callout when permission false', async () => {
    invoke.mockImplementation(async (channel: string) => {
      if (channel.includes('permission')) return false;
      if (channel === 'desktop-capturer-get-sources') return sources;
      return undefined;
    });
    let setVisible: ((v: boolean) => void) | undefined;
    render(
      <ScreenSharePicker
        onMounted={(fn) => {
          setVisible = fn;
        }}
      />
    );
    await act(async () => {
      setVisible?.(true);
    });
    await waitFor(() => {
      expect(
        screen.getByText('screenSharing.permissionDenied')
      ).toBeInTheDocument();
    });
    await act(async () => {
      setVisible?.(false);
    });
  });

  it('handles fetchSources failure without crashing', async () => {
    invoke.mockImplementation(async (channel: string) => {
      if (channel.includes('permission')) return true;
      if (channel === 'desktop-capturer-get-sources') {
        throw new Error('enum failed');
      }
      return undefined;
    });
    let setVisible: ((v: boolean) => void) | undefined;
    render(
      <ScreenSharePicker
        onMounted={(fn) => {
          setVisible = fn;
        }}
      />
    );
    await act(async () => {
      setVisible?.(true);
    });
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();

    await act(async () => {
      setVisible?.(false);
    });
    expect(send).toHaveBeenCalledWith(
      'video-call-window/screen-sharing-source-responded',
      null
    );
  });
});
