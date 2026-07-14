import { APP_MENU_TRIGGERED } from '../../actions';
import { renderWithStore, screen, userEvent } from '../../test-utils';
import { MeatballMenuButton } from './MeatballMenuButton';

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

describe('MeatballMenuButton', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('dispatches APP_MENU_TRIGGERED with numeric coordinates derived from the button rect on click', async () => {
    const user = userEvent.setup();
    renderWithStore(<MeatballMenuButton />);

    const button = screen.getByRole('button', { name: 'tabBar.meatballMenu' });

    jest.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      left: 12.4,
      bottom: 40.6,
      top: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    await user.click(button);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: APP_MENU_TRIGGERED,
      payload: { x: 12, y: 41 },
    });
  });

  it('renders with white text color', () => {
    renderWithStore(<MeatballMenuButton />);

    const button = screen.getByRole('button', { name: 'tabBar.meatballMenu' });
    expect(button).toHaveStyle({ color: '#ffffff' });
  });

  it('exposes menu affordance attributes for accessibility', () => {
    renderWithStore(<MeatballMenuButton />);

    const button = screen.getByRole('button', { name: 'tabBar.meatballMenu' });
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('opens the menu on a solo Alt key press', () => {
    renderWithStore(<MeatballMenuButton />);

    const button = screen.getByRole('button', { name: 'tabBar.meatballMenu' });
    jest.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      bottom: 32,
      top: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt' }));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: APP_MENU_TRIGGERED,
      payload: { x: 0, y: 32 },
    });
  });

  it('does not open the menu when Alt is used as a modifier for another key', () => {
    renderWithStore(<MeatballMenuButton />);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt' }));

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
