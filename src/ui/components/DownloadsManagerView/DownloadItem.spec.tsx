import { invoke } from '../../../ipc/renderer';
import { renderWithStore, screen, userEvent } from '../../test-utils';
import DownloadItem from './DownloadItem';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
      format: (value: unknown, format: string) => `${format}:${value}`,
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('../../../ipc/renderer', () => ({
  invoke: jest.fn(),
}));

const invokeMock = invoke as jest.MockedFunction<typeof invoke>;

const baseDownload = {
  itemId: 42,
  status: 'All' as const,
  fileName: 'report.pdf',
  receivedBytes: 500,
  totalBytes: 1000,
  startTime: 0,
  endTime: 1000,
  url: 'https://example.com/report.pdf',
  serverUrl: 'https://chat.example.com',
  serverTitle: 'Example Server',
  savePath: '/downloads/report.pdf',
  mimeType: 'application/pdf',
};

const renderItem = (overrides: Record<string, unknown> = {}) =>
  renderWithStore(<DownloadItem {...(baseDownload as any)} {...overrides} />);

beforeEach(() => {
  invokeMock.mockClear();
});

describe('DownloadItem', () => {
  it('renders the file name and server title', () => {
    renderItem({ state: 'progressing' });

    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    expect(screen.getByText('Example Server')).toBeInTheDocument();
  });

  it('renders the file icon label from the extension', () => {
    renderItem({ state: 'progressing' });

    expect(screen.getByAltText('pdf')).toBeInTheDocument();
  });

  describe('progressing state', () => {
    it('shows copy link, pause and cancel actions', () => {
      renderItem({ state: 'progressing' });

      expect(
        screen.getByRole('button', { name: 'downloads.item.copyLink' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'downloads.item.pause' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'downloads.item.cancel' })
      ).toBeInTheDocument();
    });

    it('invokes downloads/pause and downloads/cancel with the item id', async () => {
      renderItem({ state: 'progressing' });

      await userEvent.click(
        screen.getByRole('button', { name: 'downloads.item.pause' })
      );
      expect(invokeMock).toHaveBeenCalledWith('downloads/pause', 42);

      await userEvent.click(
        screen.getByRole('button', { name: 'downloads.item.cancel' })
      );
      expect(invokeMock).toHaveBeenCalledWith('downloads/cancel', 42);
    });

    it('invokes downloads/copy-link when copy link is clicked', async () => {
      renderItem({ state: 'progressing' });

      await userEvent.click(
        screen.getByRole('button', { name: 'downloads.item.copyLink' })
      );

      expect(invokeMock).toHaveBeenCalledWith('downloads/copy-link', 42);
    });
  });

  describe('paused state', () => {
    it('shows resume and cancel actions', () => {
      renderItem({ state: 'paused' });

      expect(
        screen.getByRole('button', { name: 'downloads.item.resume' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'downloads.item.cancel' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'downloads.item.pause' })
      ).not.toBeInTheDocument();
    });

    it('invokes downloads/resume when resume is clicked', async () => {
      renderItem({ state: 'paused' });

      await userEvent.click(
        screen.getByRole('button', { name: 'downloads.item.resume' })
      );

      expect(invokeMock).toHaveBeenCalledWith('downloads/resume', 42);
    });
  });

  describe('completed state', () => {
    it('shows show in folder and remove actions', () => {
      renderItem({ state: 'completed', receivedBytes: 1000 });

      expect(
        screen.getByRole('button', { name: 'downloads.item.showInFolder' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'downloads.item.remove' })
      ).toBeInTheDocument();
    });

    it('invokes downloads/show-in-folder and downloads/remove', async () => {
      renderItem({ state: 'completed', receivedBytes: 1000 });

      await userEvent.click(
        screen.getByRole('button', { name: 'downloads.item.showInFolder' })
      );
      expect(invokeMock).toHaveBeenCalledWith('downloads/show-in-folder', 42);

      await userEvent.click(
        screen.getByRole('button', { name: 'downloads.item.remove' })
      );
      expect(invokeMock).toHaveBeenCalledWith('downloads/remove', 42);
    });
  });

  describe('errored state', () => {
    it.each(['interrupted', 'cancelled'])(
      'shows retry and remove actions when %s',
      (state) => {
        renderItem({ state });

        expect(
          screen.getByRole('button', { name: 'downloads.item.retry' })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: 'downloads.item.remove' })
        ).toBeInTheDocument();
      }
    );

    it('invokes downloads/retry when retry is clicked', async () => {
      renderItem({ state: 'interrupted' });

      await userEvent.click(
        screen.getByRole('button', { name: 'downloads.item.retry' })
      );

      expect(invokeMock).toHaveBeenCalledWith('downloads/retry', 42);
    });
  });

  describe('expired state', () => {
    it('shows only a remove action and no copy link', () => {
      renderItem({ state: 'expired' });

      expect(
        screen.getByRole('button', { name: 'downloads.item.remove' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'downloads.item.copyLink' })
      ).not.toBeInTheDocument();
    });

    it('invokes downloads/remove when remove is clicked', async () => {
      renderItem({ state: 'expired' });

      await userEvent.click(
        screen.getByRole('button', { name: 'downloads.item.remove' })
      );

      expect(invokeMock).toHaveBeenCalledWith('downloads/remove', 42);
    });
  });
});
