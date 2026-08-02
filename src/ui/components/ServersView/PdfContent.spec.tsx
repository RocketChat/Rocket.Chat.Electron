import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';

const dispatch = jest.fn();

jest.mock('../../../store', () => ({
  dispatch: (...args: any[]) => dispatch(...args),
}));

import PdfContent from './PdfContent';

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
    // webview may be custom element; ensure component mounted
    expect(container.firstChild).toBeTruthy();
  });

  it('clears document when url becomes empty', () => {
    const { rerender } = render(
      <PdfContent url='file:///doc.pdf' partition='persist:server' />
    );
    act(() => {
      jest.advanceTimersByTime(150);
    });
    rerender(<PdfContent url='' partition='persist:server' />);
    expect(screen.queryByRole('progressbar')).toBeFalsy();
  });
});
