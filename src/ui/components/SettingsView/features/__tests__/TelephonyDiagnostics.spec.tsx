import '@testing-library/jest-dom';
import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react';

import type { TelephonyDiagnostics } from '../../../../../telephony/diagnostics';
import { TELEPHONY_DEFAULT_HANDLER_PROMPT_OPEN_SETTINGS_CLICKED } from '../../../../actions';
import { TelephonyDiagnostics as TelephonyDiagnosticsComponent } from '../TelephonyDiagnostics';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  }),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

const mockInvoke = jest.fn();
jest.mock('../../../../../ipc/renderer', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

// Fuselage Throbber uses SVG/canvas — simplified mock
jest.mock('@rocket.chat/fuselage', () => {
  const actual = jest.requireActual('@rocket.chat/fuselage') as Record<
    string,
    unknown
  >;
  return {
    ...actual,
    Throbber: () => <div data-testid='throbber' />,
  };
});

const makeDiagnostics = (
  overrides?: Partial<TelephonyDiagnostics>
): TelephonyDiagnostics => ({
  platform: 'darwin',
  generatedAt: new Date().toISOString(),
  checks: [
    {
      id: 'isDefault.tel',
      label: 'tel:// is set to Rocket.Chat',
      status: 'pass',
    },
    {
      id: 'isDefault.callto',
      label: 'callto:// is set to Rocket.Chat',
      status: 'fail',
      details: 'Not registered',
    },
    {
      id: 'windows.registeredApp',
      label: 'Windows: Rocket.Chat is in RegisteredApplications',
      status: 'unknown',
      details: 'registry locked',
    },
  ],
  ...overrides,
});

describe('TelephonyDiagnostics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress act() warnings from async state updates
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore?.();
  });

  it('shows a loading state initially, then renders checks after the promise resolves', async () => {
    let resolvePromise!: (d: TelephonyDiagnostics) => void;
    const pending = new Promise<TelephonyDiagnostics>((resolve) => {
      resolvePromise = resolve;
    });
    mockInvoke.mockReturnValue(pending);

    render(<TelephonyDiagnosticsComponent />);

    expect(screen.getByTestId('throbber')).toBeInTheDocument();

    await act(async () => {
      resolvePromise(makeDiagnostics());
      await pending;
    });

    await waitFor(() => {
      expect(screen.queryByTestId('throbber')).not.toBeInTheDocument();
    });

    expect(
      screen.getByText('tel:// is set to Rocket.Chat')
    ).toBeInTheDocument();
  });

  it('Refresh button re-invokes the IPC and re-renders with updated data', async () => {
    const first = makeDiagnostics();
    const second = makeDiagnostics({
      checks: [
        {
          id: 'isDefault.tel',
          label: 'tel:// is set to Rocket.Chat',
          status: 'pass',
        },
      ],
    });

    mockInvoke.mockResolvedValueOnce(first).mockResolvedValueOnce(second);

    render(<TelephonyDiagnosticsComponent />);

    await waitFor(() => {
      expect(screen.queryByTestId('throbber')).not.toBeInTheDocument();
    });

    expect(mockInvoke).toHaveBeenCalledTimes(1);

    const refreshButton = screen.getByText('telephony.diagnostics.refresh');
    await act(async () => {
      fireEvent.click(refreshButton);
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });

    expect(mockInvoke).toHaveBeenCalledWith('telephony/get-diagnostics');
  });

  it('Copy button calls navigator.clipboard.writeText with JSON containing platform and check ids', async () => {
    const diagnostics = makeDiagnostics();
    mockInvoke.mockResolvedValue(diagnostics);

    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<TelephonyDiagnosticsComponent />);

    await waitFor(() => {
      expect(screen.queryByTestId('throbber')).not.toBeInTheDocument();
    });

    const copyButton = screen.getByText('telephony.diagnostics.copy');
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(
      writeText.mock.calls[0][0]
    ) as TelephonyDiagnostics;
    expect(payload.platform).toBe('darwin');
    expect(payload.checks.map((c) => c.id)).toContain('isDefault.tel');
  });

  it('pass status renders pill with data-status="pass"', async () => {
    mockInvoke.mockResolvedValue(
      makeDiagnostics({
        checks: [
          {
            id: 'isDefault.tel',
            label: 'tel:// is set to Rocket.Chat',
            status: 'pass',
          },
        ],
      })
    );

    render(<TelephonyDiagnosticsComponent />);

    await waitFor(() => {
      expect(screen.queryByTestId('throbber')).not.toBeInTheDocument();
    });

    const pill = screen.getByTestId('telephony-diagnostic-status');
    expect(pill.getAttribute('data-status')).toBe('pass');
    expect(
      screen.queryByTestId('telephony-diagnostic-open-settings')
    ).not.toBeInTheDocument();
  });

  it('fail status renders pill with data-status="fail"', async () => {
    mockInvoke.mockResolvedValue(
      makeDiagnostics({
        checks: [
          {
            id: 'isDefault.callto',
            label: 'callto:// is set to Rocket.Chat',
            status: 'fail',
            details: 'Not registered',
          },
        ],
      })
    );

    render(<TelephonyDiagnosticsComponent />);

    await waitFor(() => {
      expect(screen.queryByTestId('throbber')).not.toBeInTheDocument();
    });

    const pill = screen.getByTestId('telephony-diagnostic-status');
    expect(pill.getAttribute('data-status')).toBe('fail');
    expect(
      screen.queryByTestId('telephony-diagnostic-open-settings')
    ).not.toBeInTheDocument();
  });

  it('shows an open settings action for actionable failures', async () => {
    mockInvoke.mockResolvedValue(
      makeDiagnostics({
        checks: [
          {
            id: 'isDefault.callto',
            label: 'callto:// is set to Rocket.Chat',
            status: 'fail',
            details: 'Not registered',
            action: 'openDefaultAppsSettings',
          },
        ],
      })
    );

    render(<TelephonyDiagnosticsComponent />);

    await waitFor(() => {
      expect(screen.queryByTestId('throbber')).not.toBeInTheDocument();
    });

    expect(
      screen.getByTestId('telephony-diagnostic-open-settings')
    ).toHaveTextContent('telephony.diagnostics.openSettingsAction');
  });

  it('open settings action dispatches the default apps action', async () => {
    mockInvoke.mockResolvedValue(
      makeDiagnostics({
        checks: [
          {
            id: 'isDefault.callto',
            label: 'callto:// is set to Rocket.Chat',
            status: 'fail',
            details: 'Not registered',
            action: 'openDefaultAppsSettings',
          },
        ],
      })
    );

    render(<TelephonyDiagnosticsComponent />);

    await waitFor(() => {
      expect(screen.queryByTestId('throbber')).not.toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('telephony-diagnostic-open-settings'));
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: TELEPHONY_DEFAULT_HANDLER_PROMPT_OPEN_SETTINGS_CLICKED,
    });
  });

  it('unknown status renders pill with data-status="unknown"', async () => {
    mockInvoke.mockResolvedValue(
      makeDiagnostics({
        checks: [
          {
            id: 'isDefault.sip',
            label: 'sip:// is set to Rocket.Chat',
            status: 'unknown',
            details: 'registry locked',
          },
        ],
      })
    );

    render(<TelephonyDiagnosticsComponent />);

    await waitFor(() => {
      expect(screen.queryByTestId('throbber')).not.toBeInTheDocument();
    });

    const pill = screen.getByTestId('telephony-diagnostic-status');
    expect(pill.getAttribute('data-status')).toBe('unknown');
  });
});
