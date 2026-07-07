import DownloadsManagerView from '.';
import type { Download } from '../../../downloads/common';
import { renderWithStore, screen, userEvent } from '../../test-utils';

// The filter values are persisted through fuselage's `useLocalStorage`, which
// is backed by `useSyncExternalStore` + a module-level event emitter. Under the
// jest-electron renderer that subscription does not re-render the component when
// the value is written at runtime, so typing into the search box updates the DOM
// input but never the React state the list filters on. Seeding the persisted
// value before render reproduces the production filter behaviour deterministically
// (the hook reads its initial value straight from localStorage on mount). The key
// prefix is fuselage's internal `fuselage-localStorage-<key>` format.
const seedFilter = (key: string, value: string): void => {
  window.localStorage.setItem(
    `fuselage-localStorage-${key}`,
    JSON.stringify(value)
  );
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const mockDispatch = jest.fn();

jest.mock('../../../store', () => ({
  dispatch: (action: unknown) => mockDispatch(action),
}));

// Stub the child item so the list renders cheaply and is easy to assert on.
jest.mock('./DownloadItem', () => ({
  __esModule: true,
  default: ({ itemId, fileName }: { itemId: number; fileName: string }) => (
    <div data-testid={`download-item-${itemId}`}>{fileName}</div>
  ),
}));

const baseDownload: Download = {
  itemId: 1,
  state: 'completed',
  status: 'All',
  fileName: 'alpha.pdf',
  receivedBytes: 1000,
  totalBytes: 1000,
  startTime: 0,
  endTime: 1000,
  url: 'https://example.com/alpha.pdf',
  serverUrl: 'https://chat.example.com',
  serverTitle: 'Example Server',
  savePath: '/downloads/alpha.pdf',
  mimeType: 'application/pdf',
};

const makeDownload = (overrides: Partial<Download>): Download => ({
  ...baseDownload,
  ...overrides,
});

const visibleState = {
  currentView: 'downloads',
  downloads: {},
} as any;

beforeEach(() => {
  mockDispatch.mockClear();
  window.localStorage.clear();
});

describe('DownloadsManagerView', () => {
  it('renders the title', () => {
    renderWithStore(<DownloadsManagerView />, {
      preloadedState: visibleState,
    });

    expect(screen.getByText('downloads.title')).toBeInTheDocument();
  });

  describe('empty state', () => {
    it('shows the empty title and subtitle when there are no downloads', () => {
      renderWithStore(<DownloadsManagerView />, {
        preloadedState: { ...visibleState, downloads: {} },
      });

      expect(screen.getByText('downloads.empty.title')).toBeInTheDocument();
      expect(screen.getByText('downloads.empty.subtitle')).toBeInTheDocument();
    });
  });

  describe('populated state', () => {
    const populatedState = {
      ...visibleState,
      downloads: {
        1: makeDownload({ itemId: 1, fileName: 'alpha.pdf' }),
        2: makeDownload({ itemId: 2, fileName: 'beta.png' }),
      },
    } as any;

    it('renders one item per download', () => {
      renderWithStore(<DownloadsManagerView />, {
        preloadedState: populatedState,
      });

      expect(screen.getByTestId('download-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('download-item-2')).toBeInTheDocument();
      expect(screen.getByText('alpha.pdf')).toBeInTheDocument();
      expect(screen.getByText('beta.png')).toBeInTheDocument();
    });

    it('does not show the empty state when there are downloads', () => {
      renderWithStore(<DownloadsManagerView />, {
        preloadedState: populatedState,
      });

      expect(
        screen.queryByText('downloads.empty.title')
      ).not.toBeInTheDocument();
    });

    it('filters the list by the search input (file name substring)', () => {
      seedFilter('download-search', 'beta');
      renderWithStore(<DownloadsManagerView />, {
        preloadedState: populatedState,
      });

      const search = screen.getByLabelText(
        'downloads.filters.search'
      ) as HTMLInputElement;
      expect(search.value).toBe('beta');
      expect(screen.queryByTestId('download-item-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('download-item-2')).toBeInTheDocument();
    });

    it('shows the no-results state when search matches nothing', () => {
      seedFilter('download-search', 'zzz-nomatch');
      renderWithStore(<DownloadsManagerView />, {
        preloadedState: populatedState,
      });

      expect(screen.getByText('downloads.noResults.title')).toBeInTheDocument();
      expect(screen.queryByTestId('download-item-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('download-item-2')).not.toBeInTheDocument();
    });

    it('clears the search filter when the clear-all button is clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<DownloadsManagerView />, {
        preloadedState: populatedState,
      });

      const search = screen.getByLabelText(
        'downloads.filters.search'
      ) as HTMLInputElement;
      await user.type(search, 'beta');
      expect(search.value).toBe('beta');

      await user.click(
        screen.getByRole('button', { name: 'downloads.filters.clear' })
      );

      expect(search.value).toBe('');
      expect(screen.getByTestId('download-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('download-item-2')).toBeInTheDocument();
    });
  });
});
