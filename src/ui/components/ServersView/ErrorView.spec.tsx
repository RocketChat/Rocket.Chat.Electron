import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import type { ServerFailure } from '../../../servers/common';
import ErrorView from './ErrorView';

const mockWriteText = jest.fn();

jest.mock('electron', () => ({
  clipboard: { writeText: (text: string) => mockWriteText(text) },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key} ${JSON.stringify(options)}` : key,
  }),
}));

const SERVER_URL = 'https://chat.example.com/';

const failure: ServerFailure = {
  kind: 'load-failed',
  at: '2026-11-03T12:00:00.000Z',
  errorCode: -105,
  errorDescription: 'ERR_NAME_NOT_RESOLVED',
  url: SERVER_URL,
};

const renderWithStore = (ui: ReactElement) =>
  render(
    <Provider store={createStore(() => ({ appVersion: '4.19.0' }))}>
      {ui}
    </Provider>
  );

describe('ErrorView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockWriteText.mockReset();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders nothing when not failed', () => {
    const { container } = renderWithStore(
      <ErrorView isFailed={false} serverUrl={SERVER_URL} onReload={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows reload button with countdown when failed', () => {
    renderWithStore(
      <ErrorView isFailed serverUrl={SERVER_URL} onReload={jest.fn()} />
    );
    expect(screen.getByText('loadingError.announcement')).toBeInTheDocument();
    expect(screen.getByText('loadingError.title')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /loadingError\.reload/ })
    ).toBeInTheDocument();
  });

  it('calls onReload when reload button is clicked', () => {
    const onReload = jest.fn();
    renderWithStore(
      <ErrorView isFailed serverUrl={SERVER_URL} onReload={onReload} />
    );
    fireEvent.click(
      screen.getByRole('button', { name: /loadingError\.reload/ })
    );
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('auto-reloads when countdown reaches zero', () => {
    const onReload = jest.fn();
    renderWithStore(
      <ErrorView
        isFailed
        serverUrl={SERVER_URL}
        failure={failure}
        onReload={onReload}
      />
    );

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(onReload).toHaveBeenCalled();
  });

  it('shows no cause and no copy button when the cause is not known', () => {
    renderWithStore(
      <ErrorView isFailed serverUrl={SERVER_URL} onReload={jest.fn()} />
    );

    expect(screen.queryByText(/loadingError\.cause/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'loadingError.copyDetails' })
    ).not.toBeInTheDocument();
  });

  it.each<[ServerFailure, string]>([
    [
      failure,
      'loadingError.cause.loadFailed {"error":"ERR_NAME_NOT_RESOLVED"}',
    ],
    [
      { kind: 'unresponsive', at: failure.at },
      'loadingError.cause.unresponsive',
    ],
    [
      { kind: 'stuck', at: failure.at, reason: 'PROBE_TIMED_OUT' },
      'loadingError.cause.stuck {"reason":"PROBE_TIMED_OUT"}',
    ],
    [
      { kind: 'renderer-gone', at: failure.at, reason: 'oom', exitCode: 1 },
      'loadingError.cause.rendererGone {"reason":"oom"}',
    ],
  ])('shows the cause of a %o failure', (failure, cause) => {
    renderWithStore(
      <ErrorView
        isFailed
        serverUrl={SERVER_URL}
        failure={failure}
        onReload={jest.fn()}
      />
    );

    expect(screen.getByText(cause)).toBeInTheDocument();
  });

  it('copies the error details and confirms it for a moment', () => {
    renderWithStore(
      <ErrorView
        isFailed
        serverUrl={SERVER_URL}
        failure={failure}
        onReload={jest.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'loadingError.copyDetails' })
    );

    expect(mockWriteText).toHaveBeenCalledTimes(1);
    const [details] = mockWriteText.mock.calls[0];
    expect(details).toContain(`Server: ${SERVER_URL}`);
    expect(details).toContain('Error: ERR_NAME_NOT_RESOLVED (-105)');
    expect(details).toContain('App version: 4.19.0');
    expect(
      screen.getByRole('button', { name: 'loadingError.copied' })
    ).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(
      screen.getByRole('button', { name: 'loadingError.copyDetails' })
    ).toBeInTheDocument();
  });

  it('drops the copied label when a new failure arrives', () => {
    const { rerender } = renderWithStore(
      <ErrorView
        isFailed
        serverUrl={SERVER_URL}
        failure={failure}
        onReload={jest.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'loadingError.copyDetails' })
    );
    expect(
      screen.getByRole('button', { name: 'loadingError.copied' })
    ).toBeInTheDocument();

    rerender(
      <Provider store={createStore(() => ({ appVersion: '4.19.0' }))}>
        <ErrorView
          isFailed
          serverUrl={SERVER_URL}
          failure={{ ...failure, at: '2026-11-03T12:05:00.000Z' }}
          onReload={jest.fn()}
        />
      </Provider>
    );

    expect(
      screen.getByRole('button', { name: 'loadingError.copyDetails' })
    ).toBeInTheDocument();
  });

  it('shows and hides the error details', () => {
    renderWithStore(
      <ErrorView
        isFailed
        serverUrl={SERVER_URL}
        failure={failure}
        onReload={jest.fn()}
      />
    );

    expect(screen.queryByText(/ERR_NAME_NOT_RESOLVED \(-105\)/)).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'loadingError.showDetails' })
    );
    expect(
      screen.getByText(/Error: ERR_NAME_NOT_RESOLVED \(-105\)/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'loadingError.hideDetails' })
    ).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(
      screen.getByRole('button', { name: 'loadingError.hideDetails' })
    );
    expect(screen.queryByText(/ERR_NAME_NOT_RESOLVED \(-105\)/)).toBeNull();
  });
});
