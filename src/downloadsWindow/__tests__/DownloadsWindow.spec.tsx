import { DOWNLOADS_CLEARED } from '../../downloads/actions';
import type { Download } from '../../downloads/common';
import { DownloadStatus } from '../../downloads/common';
import { invoke } from '../../ipc/renderer';
import { dispatch } from '../../store';
import {
  renderWithStore,
  screen,
  userEvent,
  waitFor,
} from '../../ui/test-utils';
import { DownloadsWindow } from '../DownloadsWindow';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${JSON.stringify(options)}` : key,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
      format: (value: unknown, format: string) => `${format}:${value}`,
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
}));

jest.mock('../../store', () => ({
  dispatch: jest.fn(),
}));

jest.mock('../../ipc/renderer', () => ({
  invoke: jest.fn(),
}));

const invokeMock = invoke as jest.MockedFunction<typeof invoke>;
const dispatchMock = dispatch as jest.MockedFunction<typeof dispatch>;

const mockDownload: Download = {
  itemId: 1,
  state: 'completed',
  status: DownloadStatus.ALL,
  fileName: 'report.pdf',
  receivedBytes: 1024,
  totalBytes: 1024,
  startTime: 1,
  endTime: 2,
  url: 'https://example.com/report.pdf',
  serverUrl: 'https://open.rocket.chat',
  serverTitle: 'Rocket.Chat',
  mimeType: 'application/pdf',
  savePath: '/tmp/report.pdf',
};

describe('DownloadsWindow clear-all confirm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invokeMock.mockResolvedValue(false as never);
  });

  const renderWindow = () =>
    renderWithStore(<DownloadsWindow paletteTheme='light' />, {
      preloadedState: {
        downloads: { [mockDownload.itemId]: mockDownload },
      },
    });

  it('does not clear the list when the confirm dialog is cancelled', async () => {
    const user = userEvent.setup();
    renderWindow();

    invokeMock.mockResolvedValueOnce(false as never);
    await user.click(
      screen.getByRole('button', { name: 'downloads.clearAll' })
    );

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith(
        'downloads-window/confirm-clear-all'
      )
    );
    expect(dispatchMock).not.toHaveBeenCalledWith({
      type: DOWNLOADS_CLEARED,
    });
  });

  it('clears the list when the confirm dialog is accepted', async () => {
    const user = userEvent.setup();
    renderWindow();

    invokeMock.mockResolvedValueOnce(true as never);
    await user.click(
      screen.getByRole('button', { name: 'downloads.clearAll' })
    );

    await waitFor(() =>
      expect(dispatchMock).toHaveBeenCalledWith({
        type: DOWNLOADS_CLEARED,
      })
    );
  });
});
