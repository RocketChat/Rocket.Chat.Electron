import { desktopCapturer } from 'electron';

import { ScreenSharingDialog } from '.';
import { SCREEN_SHARING_DIALOG_DISMISSED } from '../../../screenSharing/actions';
import { WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED } from '../../actions';
import { renderWithStore, screen, userEvent, act } from '../../test-utils';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

jest.mock('electron', () => ({
  desktopCapturer: {
    getSources: jest.fn(),
  },
}));

const mockDispatch = jest.fn();

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    __esModule: true,
    ...actual,
    useDispatch: () => mockDispatch,
  };
});

const getSourcesMock = desktopCapturer.getSources as jest.MockedFunction<
  typeof desktopCapturer.getSources
>;

const makeSource = (id: string, name: string) =>
  ({
    id,
    name,
    thumbnail: { toDataURL: () => `data:image/png;base64,${id}` },
  }) as unknown as Electron.DesktopCapturerSource;

const preloadedState = { openDialog: 'screen-sharing' } as any;

const flushSources = async () => {
  await act(async () => {
    jest.advanceTimersByTime(1000);
    // allow the awaited getSources promise to resolve
    await Promise.resolve();
  });
};

describe('ScreenSharingDialog', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockDispatch.mockClear();
    getSourcesMock.mockReset();
    getSourcesMock.mockResolvedValue([
      makeSource('screen:1', 'Entire Screen'),
      makeSource('window:1', 'Some Window'),
    ]);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders the announcement title', () => {
    renderWithStore(<ScreenSharingDialog />, { preloadedState });

    expect(
      screen.getByText('dialog.screenshare.announcement')
    ).toBeInTheDocument();
  });

  it('lists capturer sources fetched on the polling interval', async () => {
    renderWithStore(<ScreenSharingDialog />, { preloadedState });

    await flushSources();

    expect(screen.getByText('Entire Screen')).toBeInTheDocument();
    expect(screen.getByText('Some Window')).toBeInTheDocument();
    expect(getSourcesMock).toHaveBeenCalledWith({
      types: ['window', 'screen'],
    });
  });

  it('dispatches the source-responded action when a source is clicked', async () => {
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
    });
    renderWithStore(<ScreenSharingDialog />, { preloadedState });

    await flushSources();

    await user.click(screen.getByText('Entire Screen'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: WEBVIEW_SCREEN_SHARING_SOURCE_RESPONDED,
      payload: 'screen:1',
    });
  });

  it('dispatches dismissed when the dialog is closed', () => {
    renderWithStore(<ScreenSharingDialog />, { preloadedState });

    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    dialog.dispatchEvent(new Event('close'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: SCREEN_SHARING_DIALOG_DISMISSED,
    });
  });
});
