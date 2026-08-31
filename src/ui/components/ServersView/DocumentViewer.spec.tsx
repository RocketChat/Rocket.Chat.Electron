import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

import DocumentViewer from './DocumentViewer';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('./MarkdownContent', () => ({
  __esModule: true,
  default: ({ url }: { url: string }) => (
    <div data-testid='markdown'>{url}</div>
  ),
}));

jest.mock('./PdfContent', () => ({
  __esModule: true,
  default: ({ url }: { url: string }) => <div data-testid='pdf'>{url}</div>,
}));

describe('DocumentViewer', () => {
  it('renders markdown content for markdown format', () => {
    const close = jest.fn();
    render(
      <DocumentViewer
        url='file:///doc.md'
        format='markdown'
        partition='persist:server'
        closeDocumentViewer={close}
      />
    );
    expect(
      screen.getByText('documentViewer.title.markdown')
    ).toBeInTheDocument();
    expect(screen.getByTestId('markdown')).toHaveTextContent('file:///doc.md');
  });

  it('renders pdf content by default and closes on back', () => {
    const close = jest.fn();
    render(
      <DocumentViewer
        url='file:///doc.pdf'
        partition='persist:server'
        closeDocumentViewer={close}
      />
    );
    expect(screen.getByText('documentViewer.title.pdf')).toBeInTheDocument();
    expect(screen.getByTestId('pdf')).toHaveTextContent('file:///doc.pdf');
    fireEvent.click(
      screen.getByRole('button', { name: 'documentViewer.back' })
    );
    expect(close).toHaveBeenCalled();
  });
});
