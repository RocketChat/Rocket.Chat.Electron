import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

import { FindInPageBar } from './FindInPageBar';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'findInPage.matchCount' && opts) {
        return `${opts.current} of ${opts.total}`;
      }
      return key;
    },
  }),
}));

const noop = () => undefined;

describe('FindInPageBar', () => {
  it('renders the placeholder and match counter', () => {
    render(
      <FindInPageBar
        query='hello'
        onQueryChange={noop}
        activeMatchOrdinal={1}
        matches={3}
        onNext={noop}
        onPrevious={noop}
        onClose={noop}
      />
    );

    expect(
      screen.getByPlaceholderText('findInPage.placeholder')
    ).toBeInTheDocument();
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
  });

  it('shows no matches message when query is set but matches is zero', () => {
    render(
      <FindInPageBar
        query='xyz'
        onQueryChange={noop}
        activeMatchOrdinal={0}
        matches={0}
        onNext={noop}
        onPrevious={noop}
        onClose={noop}
      />
    );

    expect(screen.getByText('findInPage.noMatches')).toBeInTheDocument();
  });

  it('calls onQueryChange when typing', () => {
    const onQueryChange = jest.fn();
    render(
      <FindInPageBar
        query=''
        onQueryChange={onQueryChange}
        activeMatchOrdinal={0}
        matches={0}
        onNext={noop}
        onPrevious={noop}
        onClose={noop}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('findInPage.placeholder'), {
      target: { value: 'test' },
    });
    expect(onQueryChange).toHaveBeenCalledWith('test');
  });

  it('calls onNext on Enter and onPrevious on Shift+Enter', () => {
    const onNext = jest.fn();
    const onPrevious = jest.fn();
    render(
      <FindInPageBar
        query='hello'
        onQueryChange={noop}
        activeMatchOrdinal={1}
        matches={2}
        onNext={onNext}
        onPrevious={onPrevious}
        onClose={noop}
      />
    );

    const input = screen.getByPlaceholderText('findInPage.placeholder');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onNext).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape', () => {
    const onClose = jest.fn();
    render(
      <FindInPageBar
        query='hello'
        onQueryChange={noop}
        activeMatchOrdinal={1}
        matches={2}
        onNext={noop}
        onPrevious={noop}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(screen.getByPlaceholderText('findInPage.placeholder'), {
      key: 'Escape',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the same input DOM node across a query change', () => {
    const { rerender } = render(
      <FindInPageBar
        query=''
        onQueryChange={noop}
        activeMatchOrdinal={0}
        matches={0}
        onNext={noop}
        onPrevious={noop}
        onClose={noop}
      />
    );

    const inputBeforeTyping = screen.getByPlaceholderText(
      'findInPage.placeholder'
    );

    rerender(
      <FindInPageBar
        query='a'
        onQueryChange={noop}
        activeMatchOrdinal={1}
        matches={5}
        onNext={noop}
        onPrevious={noop}
        onClose={noop}
      />
    );

    const inputAfterTyping = screen.getByPlaceholderText(
      'findInPage.placeholder'
    );

    expect(inputAfterTyping).toBe(inputBeforeTyping);
    expect(screen.getByText('1 of 5')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    render(
      <FindInPageBar
        query='hello'
        onQueryChange={noop}
        activeMatchOrdinal={1}
        matches={2}
        onNext={noop}
        onPrevious={noop}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByTitle('findInPage.close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
