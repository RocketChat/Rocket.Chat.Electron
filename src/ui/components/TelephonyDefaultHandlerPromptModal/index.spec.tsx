import '@testing-library/jest-dom';
import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import type { RootState } from '../../../store/rootReducer';
import type { TelephonyDiagnostics } from '../../../telephony/diagnostics';
import {
  TELEPHONY_DEFAULT_HANDLER_PROMPT_CLOSE,
  TELEPHONY_DEFAULT_HANDLER_PROMPT_OPEN_SETTINGS_CLICKED,
} from '../../actions';
import { TelephonyDefaultHandlerPromptModal } from './index';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockInvoke = jest.fn();
jest.mock('../../../ipc/renderer', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

// Dialog uses showModal() which is not available in jsdom.
// Mock to a simple conditional wrapper focused on content/dispatch logic.
jest.mock('../Dialog', () => ({
  Dialog: ({
    children,
    isVisible,
    onClose,
  }: {
    children?: ReactNode;
    isVisible?: boolean;
    onClose?: () => void;
  }) =>
    isVisible ? (
      <div data-testid='dialog' role='dialog'>
        <button data-testid='dialog-close' onClick={onClose}>
          close
        </button>
        {children}
      </div>
    ) : null,
}));

type PartialState = Pick<RootState, 'dialogs'>;

const makeStore = (partial: PartialState) => {
  const reducer = (state: PartialState = partial) => state;
  return createStore(reducer as any);
};

const openState = (): PartialState => ({
  dialogs: {
    telephonyDefaultHandlerPrompt: { isOpen: true },
    telephonyServerSelect: null,
    serverInfoModal: { isOpen: false, serverData: null },
  } as unknown as RootState['dialogs'],
});

const closedState = (): PartialState => ({
  dialogs: {
    telephonyDefaultHandlerPrompt: { isOpen: false },
    telephonyServerSelect: null,
    serverInfoModal: { isOpen: false, serverData: null },
  } as unknown as RootState['dialogs'],
});

const makeDiagnostics = (
  checks: TelephonyDiagnostics['checks']
): TelephonyDiagnostics => ({
  platform: process.platform,
  generatedAt: new Date().toISOString(),
  checks,
});

const flushDiagnostics = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const setPlatform = (platform: NodeJS.Platform): (() => void) => {
  const original = process.platform;
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true,
  });
  return () =>
    Object.defineProperty(process, 'platform', {
      value: original,
      configurable: true,
    });
};

describe('TelephonyDefaultHandlerPromptModal', () => {
  let restorePlatform: () => void;

  afterEach(() => {
    restorePlatform?.();
    jest.clearAllMocks();
  });

  it('renders nothing when isOpen=false', () => {
    restorePlatform = setPlatform('linux');
    mockInvoke.mockResolvedValue(makeDiagnostics([]));
    const store = makeStore(closedState());
    const { container } = render(
      <Provider store={store}>
        <TelephonyDefaultHandlerPromptModal />
      </Provider>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('renders only the generic copy and dismiss button when Windows diagnostics pass', async () => {
    restorePlatform = setPlatform('win32');
    mockInvoke.mockResolvedValue(
      makeDiagnostics([
        {
          id: 'isDefault.tel',
          label: 'tel:// is set to Rocket.Chat',
          status: 'pass',
        },
      ])
    );
    const store = makeStore(openState());
    render(
      <Provider store={store}>
        <TelephonyDefaultHandlerPromptModal />
      </Provider>
    );

    await flushDiagnostics();

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('telephony/get-diagnostics');
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText('telephony.defaultHandlerPrompt.title')
    ).toBeInTheDocument();
    expect(
      screen.getByText('telephony.defaultHandlerPrompt.body')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('telephony.defaultHandlerPrompt.bodyWindows')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('telephony.defaultHandlerPrompt.openSettingsWindows')
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('telephony.defaultHandlerPrompt.dismiss')
    ).toBeInTheDocument();
  });

  it('renders only the generic copy and dismiss button when Linux diagnostics pass', async () => {
    restorePlatform = setPlatform('linux');
    mockInvoke.mockResolvedValue(
      makeDiagnostics([
        {
          id: 'linux.xdg.tel',
          label: 'Linux: tel is set to Rocket.Chat',
          status: 'pass',
        },
      ])
    );
    const store = makeStore(openState());
    render(
      <Provider store={store}>
        <TelephonyDefaultHandlerPromptModal />
      </Provider>
    );

    await flushDiagnostics();

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('telephony/get-diagnostics');
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText('telephony.defaultHandlerPrompt.title')
    ).toBeInTheDocument();
    expect(
      screen.getByText('telephony.defaultHandlerPrompt.body')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('telephony.defaultHandlerPrompt.bodyLinux')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('telephony.defaultHandlerPrompt.openSettingsLinux')
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('telephony.defaultHandlerPrompt.dismiss')
    ).toBeInTheDocument();
  });

  it('renders platform guidance and open settings button for actionable failures', async () => {
    restorePlatform = setPlatform('linux');
    mockInvoke.mockResolvedValue(
      makeDiagnostics([
        {
          id: 'linux.xdg.tel',
          label: 'Linux: tel is set to Rocket.Chat',
          status: 'fail',
          details: 'facetime.desktop',
          action: 'openDefaultAppsSettings',
        },
      ])
    );
    const store = makeStore(openState());
    render(
      <Provider store={store}>
        <TelephonyDefaultHandlerPromptModal />
      </Provider>
    );

    await flushDiagnostics();

    await waitFor(() => {
      expect(
        screen.getByText('telephony.defaultHandlerPrompt.openSettingsLinux')
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText('telephony.defaultHandlerPrompt.bodyLinux')
    ).toBeInTheDocument();
  });

  it('hides body2 and openSettings button on darwin', async () => {
    restorePlatform = setPlatform('darwin');
    mockInvoke.mockResolvedValue(
      makeDiagnostics([
        {
          id: 'isDefault.tel',
          label: 'tel:// is set to Rocket.Chat',
          status: 'fail',
          action: 'openDefaultAppsSettings',
        },
      ])
    );
    const store = makeStore(openState());
    render(
      <Provider store={store}>
        <TelephonyDefaultHandlerPromptModal />
      </Provider>
    );

    await flushDiagnostics();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.queryByText('telephony.defaultHandlerPrompt.bodyLinux')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('telephony.defaultHandlerPrompt.openSettingsLinux')
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('telephony.defaultHandlerPrompt.dismiss')
    ).toBeInTheDocument();
  });

  it('dismiss button dispatches TELEPHONY_DEFAULT_HANDLER_PROMPT_CLOSE only', async () => {
    restorePlatform = setPlatform('linux');
    mockInvoke.mockResolvedValue(makeDiagnostics([]));
    const store = makeStore(openState());
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <TelephonyDefaultHandlerPromptModal />
      </Provider>
    );

    await flushDiagnostics();

    fireEvent.click(screen.getByText('telephony.defaultHandlerPrompt.dismiss'));

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith({
      type: TELEPHONY_DEFAULT_HANDLER_PROMPT_CLOSE,
    });
  });

  it('open settings button dispatches OPEN_SETTINGS_CLICKED then CLOSE in order', async () => {
    restorePlatform = setPlatform('linux');
    mockInvoke.mockResolvedValue(
      makeDiagnostics([
        {
          id: 'linux.xdg.tel',
          label: 'Linux: tel is set to Rocket.Chat',
          status: 'fail',
          details: 'facetime.desktop',
          action: 'openDefaultAppsSettings',
        },
      ])
    );
    const store = makeStore(openState());
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <TelephonyDefaultHandlerPromptModal />
      </Provider>
    );

    await flushDiagnostics();

    await waitFor(() => {
      expect(
        screen.getByText('telephony.defaultHandlerPrompt.openSettingsLinux')
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByText('telephony.defaultHandlerPrompt.openSettingsLinux')
    );

    expect(dispatchSpy).toHaveBeenCalledTimes(2);
    expect(dispatchSpy).toHaveBeenNthCalledWith(1, {
      type: TELEPHONY_DEFAULT_HANDLER_PROMPT_OPEN_SETTINGS_CLICKED,
    });
    expect(dispatchSpy).toHaveBeenNthCalledWith(2, {
      type: TELEPHONY_DEFAULT_HANDLER_PROMPT_CLOSE,
    });
  });
});
