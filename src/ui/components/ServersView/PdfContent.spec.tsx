import '@testing-library/jest-dom';
import { act, render } from '@testing-library/react';

import PdfContent from './PdfContent';

const dispatch = jest.fn();

jest.mock('../../../store', () => ({
  dispatch: (...args: any[]) => dispatch(...args),
}));

describe('PdfContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders webview for a pdf url after delay', () => {
    const { container } = render(
      <PdfContent url='file:///doc.pdf' partition='persist:server' />
    );
    act(() => {
      jest.advanceTimersByTime(150);
    });
    const webview = container.querySelector('webview');
    expect(webview).not.toBeNull();
    expect(webview?.getAttribute('src')).toBe('file:///doc.pdf');
  });

  it('clears document when url becomes empty', () => {
    const { container, rerender } = render(
      <PdfContent url='file:///doc.pdf' partition='persist:server' />
    );
    act(() => {
      jest.advanceTimersByTime(150);
    });
    rerender(<PdfContent url='' partition='persist:server' />);
    // The webview element itself stays mounted; only its src is cleared.
    expect(container.querySelector('webview')?.getAttribute('src')).toBeFalsy();
  });
});
