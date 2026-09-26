import { parseUiPreviewInput, resolveUiPreviewSource } from './uiPreview';

describe('parseUiPreviewInput', () => {
  it('reads a PR number, with or without #', () => {
    expect(parseUiPreviewInput(' 42364 ')).toEqual({ pr: '42364' });
    expect(parseUiPreviewInput('#42364')).toEqual({ pr: '42364' });
  });

  it('reads anything else as a bundle URL', () => {
    expect(parseUiPreviewInput('http://127.0.0.1:4173/')).toEqual({
      bundle: 'http://127.0.0.1:4173/',
    });
  });
});

describe('resolveUiPreviewSource', () => {
  it('labels PR builds with their ghcr.io reference', () => {
    expect(resolveUiPreviewSource({ pr: '42364' })?.label).toBe(
      'PR #42364 (ghcr.io/rocketchat/rocket.chat-web:pr-42364)'
    );
  });

  it('rejects malformed PR numbers, commits and non-http bundles', () => {
    expect(resolveUiPreviewSource({ pr: '42364;rm' })).toBeNull();
    expect(resolveUiPreviewSource({ pr: '1', sha: 'abc' })).toBeNull();
    expect(resolveUiPreviewSource({ bundle: 'file:///etc/' })).toBeNull();
    expect(resolveUiPreviewSource({ bundle: 'not a url' })).toBeNull();
  });
});
