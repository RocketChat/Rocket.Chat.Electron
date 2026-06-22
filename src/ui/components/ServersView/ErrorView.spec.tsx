import { act, renderWithStore, screen } from '../../test-utils';
import ErrorView from './ErrorView';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

describe('ErrorView', () => {
  it('renders nothing while not in a failed state', () => {
    const { container } = renderWithStore(
      <ErrorView isFailed={false} onReload={jest.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/loadingError\.reload/)).not.toBeInTheDocument();
  });

  it('triggers onReload once the auto-reload countdown elapses while failed', () => {
    jest.useFakeTimers();
    const onReload = jest.fn();

    try {
      renderWithStore(<ErrorView isFailed onReload={onReload} />);

      expect(onReload).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(60 * 1000);
      });

      expect(onReload).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('clears the countdown timer on unmount without firing onReload', () => {
    jest.useFakeTimers();
    const onReload = jest.fn();

    try {
      const { unmount } = renderWithStore(
        <ErrorView isFailed onReload={onReload} />
      );

      unmount();

      act(() => {
        jest.advanceTimersByTime(120 * 1000);
      });

      expect(onReload).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
