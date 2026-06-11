import { isMarkdownViewerDownloadUrl } from './isMarkdownViewerDownloadUrl';

describe('isMarkdownViewerDownloadUrl', () => {
  it('intercepts a title-link view URL (URLSearchParams trailing "download=")', () => {
    expect(
      isMarkdownViewerDownloadUrl(
        'https://srv/file-upload/x/doc.md?download=',
        'doc.md'
      )
    ).toBe(true);
  });

  it('lets a download-button URL pass through (bare "?download", no "=")', () => {
    expect(
      isMarkdownViewerDownloadUrl(
        'https://srv/file-upload/x/doc.md?download',
        'doc.md'
      )
    ).toBe(false);
  });

  it('does not intercept non-markdown files even with "download="', () => {
    expect(
      isMarkdownViewerDownloadUrl(
        'https://srv/file-upload/x/doc.pdf?download=',
        'doc.pdf'
      )
    ).toBe(false);
  });

  it('intercepts when "download=" follows another query param', () => {
    expect(
      isMarkdownViewerDownloadUrl(
        'https://srv/file-upload/x/doc.md?foo=bar&download=',
        'doc.md'
      )
    ).toBe(true);
  });

  it('lets a plain URL with no query pass through', () => {
    expect(
      isMarkdownViewerDownloadUrl('https://srv/file-upload/x/doc.md', 'doc.md')
    ).toBe(false);
  });
});
