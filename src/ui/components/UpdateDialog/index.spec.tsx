import { UpdateDialog } from '.';
import {
  UPDATE_DIALOG_DISMISSED,
  UPDATE_DIALOG_INSTALL_BUTTON_CLICKED,
  UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED,
  UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
} from '../../actions';
import { renderWithStore, screen, userEvent } from '../../test-utils';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
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

const preloadedState = {
  appVersion: '4.0.0',
  newUpdateVersion: '4.1.0',
  openDialog: 'update',
} as any;

describe('UpdateDialog', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('renders the announcement, message and both versions', () => {
    renderWithStore(<UpdateDialog />, { preloadedState });

    expect(screen.getByText('dialog.update.announcement')).toBeInTheDocument();
    expect(screen.getByText('dialog.update.message')).toBeInTheDocument();
    expect(screen.getByText('4.0.0')).toBeInTheDocument();
    expect(screen.getByText('4.1.0')).toBeInTheDocument();
  });

  it('renders the skip, remind-later and install buttons', () => {
    renderWithStore(<UpdateDialog />, { preloadedState });

    expect(screen.getByText('dialog.update.skip')).toBeInTheDocument();
    expect(screen.getByText('dialog.update.remindLater')).toBeInTheDocument();
    expect(screen.getByText('dialog.update.install')).toBeInTheDocument();
  });

  it('dispatches skip-update with the new version', async () => {
    const user = userEvent.setup();
    renderWithStore(<UpdateDialog />, { preloadedState });

    await user.click(screen.getByText('dialog.update.skip'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: UPDATE_DIALOG_SKIP_UPDATE_CLICKED,
      payload: '4.1.0',
    });
  });

  it('dispatches remind-later', async () => {
    const user = userEvent.setup();
    renderWithStore(<UpdateDialog />, { preloadedState });

    await user.click(screen.getByText('dialog.update.remindLater'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: UPDATE_DIALOG_REMIND_UPDATE_LATER_CLICKED,
    });
  });

  it('dispatches install on the install button', async () => {
    const user = userEvent.setup();
    renderWithStore(<UpdateDialog />, { preloadedState });

    await user.click(screen.getByText('dialog.update.install'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: UPDATE_DIALOG_INSTALL_BUTTON_CLICKED,
    });
  });

  it('dispatches dismissed when the dialog is closed', () => {
    renderWithStore(<UpdateDialog />, { preloadedState });

    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    dialog.dispatchEvent(new Event('close'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: UPDATE_DIALOG_DISMISSED,
    });
  });
});
