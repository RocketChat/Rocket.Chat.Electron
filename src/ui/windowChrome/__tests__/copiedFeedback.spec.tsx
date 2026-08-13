import { act, render, renderHook, screen } from '@testing-library/react';

import { TextButton } from '../TextButton';
import { CopiedStatus, useCopiedFeedback } from '../useCopiedFeedback';

describe('useCopiedFeedback', () => {
  it('keeps the [hasCopied, acknowledge] tuple', () => {
    const { result } = renderHook(() => useCopiedFeedback());

    expect(result.current).toHaveLength(2);
    expect(result.current[0]).toBe(false);
    expect(typeof result.current[1]).toBe('function');
  });

  it('announces a copied status in a polite live region', () => {
    const { result, unmount } = renderHook(() => useCopiedFeedback());

    const region = document.body.querySelector('[role="status"]');
    expect(region).not.toBeNull();
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.textContent).toBe('');

    act(() => {
      result.current[1]();
    });

    expect(result.current[0]).toBe(true);
    expect(region?.textContent).toBe('Copied');

    unmount();
    expect(document.body.querySelector('[role="status"]')).toBeNull();
  });
});

describe('CopiedStatus', () => {
  it('renders a visually hidden polite status only while copied', () => {
    const { rerender } = render(<CopiedStatus hasCopied={false} />);

    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveTextContent('');

    rerender(<CopiedStatus hasCopied />);
    expect(screen.getByRole('status')).toHaveTextContent('Copied');
  });
});

describe('TextButton', () => {
  it('is a button with a tokenized minimum hit area', () => {
    render(<TextButton onClick={() => undefined}>Select all</TextButton>);

    const button = screen.getByRole('button', { name: 'Select all' });
    const { minWidth, minHeight } = window.getComputedStyle(button);
    expect(minWidth).toBe('24px');
    expect(minHeight).toBe('24px');
  });
});
