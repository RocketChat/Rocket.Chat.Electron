import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';

import type { E2EESearchServerIndexStats } from '../../../../e2eeSearch/types';
import { SETTINGS_E2EE_SEARCH_INDEX_STATS_REQUESTED } from '../../../actions';
import {
  E2EE_SEARCH_INDEX_STATS_REFRESH_MS,
  E2eeSearchIndexStats,
} from './E2eeSearchIndexStats';

const dispatchMock = jest.fn();
let stats: E2EESearchServerIndexStats[] | null = null;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key} ${JSON.stringify(options)}` : key,
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({ e2eeSearchIndexStats: stats }),
}));

jest.mock('../../../../store', () => ({
  dispatch: (...args: unknown[]) => dispatchMock(...args),
}));

const key = 'settings.options.e2eeSearchIndexStats';

describe('E2eeSearchIndexStats', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    stats = null;
  });

  it('asks the main process for the stats when it mounts', () => {
    render(<E2eeSearchIndexStats />);
    expect(dispatchMock).toHaveBeenCalledWith({
      type: SETTINGS_E2EE_SEARCH_INDEX_STATS_REQUESTED,
    });
  });

  it('shows docs, size and at-rest state for each server', () => {
    stats = [
      {
        serverUrl: 'https://a.example.com',
        users: 1,
        docs: 20,
        bytesOnDisk: 4096,
        atRest: 'encrypted',
      },
      { users: 1, bytesOnDisk: 300, atRest: 'memory-only' },
    ];
    render(<E2eeSearchIndexStats />);

    expect(screen.getByText('https://a.example.com')).toBeInTheDocument();
    expect(
      screen.getByText(
        `${key}.messages {"count":20} · ${key}.onDisk {"size":4096} · ${key}.encrypted`
      )
    ).toBeInTheDocument();
    expect(screen.getByText(`${key}.removedServer`)).toBeInTheDocument();
    expect(
      screen.getByText(`${key}.onDisk {"size":300} · ${key}.memoryOnly`)
    ).toBeInTheDocument();
  });

  // A closed index is an encrypted snapshot, so the count is not known. The
  // line must not read as "no index".
  it('tells the user when the count of a closed index shows', () => {
    stats = [
      {
        serverUrl: 'https://a.example.com',
        users: 1,
        bytesOnDisk: 4096,
        atRest: 'encrypted',
      },
    ];
    render(<E2eeSearchIndexStats />);

    expect(
      screen.getByText(
        `${key}.countWhenOpen · ${key}.onDisk {"size":4096} · ${key}.encrypted`
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(`${key}.notLoaded`))).toBeNull();
  });

  describe('while it is shown', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('asks for the stats again at a fixed rate, and stops when it closes', () => {
      const { unmount } = render(<E2eeSearchIndexStats />);
      expect(dispatchMock).toHaveBeenCalledTimes(1);

      act(() => {
        jest.advanceTimersByTime(E2EE_SEARCH_INDEX_STATS_REFRESH_MS);
      });
      expect(dispatchMock).toHaveBeenCalledTimes(2);
      act(() => {
        jest.advanceTimersByTime(E2EE_SEARCH_INDEX_STATS_REFRESH_MS);
      });
      expect(dispatchMock).toHaveBeenCalledTimes(3);
      expect(dispatchMock).toHaveBeenLastCalledWith({
        type: SETTINGS_E2EE_SEARCH_INDEX_STATS_REQUESTED,
      });

      unmount();
      act(() => {
        jest.advanceTimersByTime(E2EE_SEARCH_INDEX_STATS_REFRESH_MS * 3);
      });
      expect(dispatchMock).toHaveBeenCalledTimes(3);
    });
  });

  it('says so when there is no index', () => {
    stats = [];
    render(<E2eeSearchIndexStats />);
    expect(screen.getByText(`${key}.empty`)).toBeInTheDocument();
  });

  it.each([
    'no-encryption',
    'basic-text-backend',
    'keychain-timeout',
    'hard-coded-wrap',
    'native-module-unavailable',
  ] as const)(
    'tells the user what to do when the index is limited by %s',
    (limitedReason) => {
      stats = [
        {
          serverUrl: 'https://a.example.com',
          users: 1,
          docs: 3,
          bytesOnDisk: 10,
          atRest: 'memory-only',
          limitedReason,
        },
      ];
      render(<E2eeSearchIndexStats />);
      expect(
        screen.getByText(`${key}.limit.${limitedReason}`)
      ).toBeInTheDocument();
    }
  );

  it('shows no limit line when the index is not limited', () => {
    stats = [
      {
        serverUrl: 'https://a.example.com',
        users: 1,
        docs: 3,
        bytesOnDisk: 10,
        atRest: 'encrypted',
      },
    ];
    render(<E2eeSearchIndexStats />);
    expect(screen.queryByText(new RegExp(`${key}.limit`))).toBeNull();
  });
});
