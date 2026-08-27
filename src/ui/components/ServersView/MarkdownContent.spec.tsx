import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';

import MarkdownContent from './MarkdownContent';

const invoke = jest.fn();

jest.mock('electron', () => ({
  ipcRenderer: {
    invoke: (...args: unknown[]) => invoke(...args),
  },
  shell: {
    openExternal: jest.fn(),
  },
}));

jest.mock('dompurify', () => ({
  __esModule: true,
  default: {
    sanitize: (html: string) => html,
  },
}));

jest.mock('highlight.js', () => ({
  __esModule: true,
  default: {
    getLanguage: () => true,
    highlight: () => ({ value: 'code' }),
  },
}));

jest.mock('marked', () => {
  class Marked {
    use() {
      return this;
    }

    setOptions() {
      return this;
    }

    parse(text: string) {
      return `<p>${text}</p>`;
    }
  }
  return { Marked };
});

jest.mock('marked-highlight', () => ({
  markedHighlight: () => ({}),
}));

describe('MarkdownContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders fetched markdown content', async () => {
    invoke.mockResolvedValue('Hello');
    const { unmount } = render(
      <MarkdownContent
        url='https://example.com/doc.md'
        partition='persist:https://example.com'
      />
    );

    await waitFor(
      () => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
    expect(invoke).toHaveBeenCalledWith(
      'document-viewer/fetch-content',
      'https://example.com/doc.md',
      'https://example.com'
    );
    unmount();
  });

  it('shows error message when fetch fails', async () => {
    invoke.mockRejectedValue(new Error('network down'));
    const { unmount } = render(
      <MarkdownContent
        url='https://example.com/doc.md'
        partition='persist:https://example.com'
      />
    );
    await waitFor(
      () => {
        expect(screen.getByText('network down')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
    unmount();
  });
});
