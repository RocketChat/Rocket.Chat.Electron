import { getFileLabel } from '../fileTypes';

describe('getFileLabel', () => {
  it('uses the extension', () => {
    expect(getFileLabel('demo-video.mp4', 'video/mp4')).toBe('mp4');
    expect(getFileLabel('archive.zip', 'application/zip')).toBe('zip');
  });

  it('falls back to the MIME subtype when the name has none', () => {
    expect(getFileLabel('screenshot', 'image/png')).toBe('png');
  });

  it('drops a structured-syntax suffix', () => {
    expect(getFileLabel('feed', 'application/rss+xml')).toBe('rss');
  });

  it('caps the label so the badge stays readable', () => {
    expect(getFileLabel('site.webmanifest')).toBe('webm');
  });

  it('strips punctuation rather than drawing it', () => {
    expect(getFileLabel('weird.t_a-r')).toBe('tar');
  });

  it('returns nothing when there is neither name nor type', () => {
    expect(getFileLabel('noextension')).toBe('');
  });

  it('takes the last extension of a multi-dot name', () => {
    expect(getFileLabel('backup.tar.gz')).toBe('gz');
  });
});
