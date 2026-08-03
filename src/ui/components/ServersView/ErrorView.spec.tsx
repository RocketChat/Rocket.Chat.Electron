import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';

import ErrorView from './ErrorView';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ErrorView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders nothing when not failed', () => {
    const { container } = render(
      <ErrorView isFailed={false} onReload={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows reload button with countdown when failed', () => {
    render(<ErrorView isFailed onReload={jest.fn()} />);
    expect(screen.getByText('loadingError.announcement')).toBeInTheDocument();
    expect(screen.getByText('loadingError.title')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /loadingError\.reload/ })
    ).toBeInTheDocument();
  });

  it('calls onReload when reload button is clicked', () => {
    const onReload = jest.fn();
    render(<ErrorView isFailed onReload={onReload} />);
    fireEvent.click(
      screen.getByRole('button', { name: /loadingError\.reload/ })
    );
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('auto-reloads when countdown reaches zero', () => {
    const onReload = jest.fn();
    render(<ErrorView isFailed onReload={onReload} />);

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(onReload).toHaveBeenCalled();
  });
});
