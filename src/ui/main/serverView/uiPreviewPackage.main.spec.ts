import fs from 'fs';
import os from 'os';
import path from 'path';

import { extractTar } from './uiPreviewPackage';

const ustarEntry = (name: string, data = '', type = '0') => {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, 'utf8');
  header.write(data.length.toString(8).padStart(11, '0'), 124, 12, 'utf8');
  header.write(type, 156, 1, 'utf8');
  header.write('ustar', 257, 6, 'utf8');
  const body = Buffer.alloc(Math.ceil(data.length / 512) * 512);
  body.write(data, 0, 'utf8');
  return Buffer.concat([header, body]);
};

const tarOf = (...entries: Buffer[]) =>
  Buffer.concat([...entries, Buffer.alloc(1024)]);

describe('extractTar', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-preview-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('writes files and directories of a ustar archive', () => {
    extractTar(
      tarOf(
        ustarEntry('./', '', '5'),
        ustarEntry('./index.html', '<html></html>'),
        ustarEntry('./bundle/', '', '5'),
        ustarEntry('./bundle/index.js', 'x'.repeat(600))
      ),
      dir
    );

    expect(fs.readFileSync(path.join(dir, 'index.html'), 'utf8')).toBe(
      '<html></html>'
    );
    expect(fs.readFileSync(path.join(dir, 'bundle/index.js'), 'utf8')).toBe(
      'x'.repeat(600)
    );
  });

  it('refuses entries that escape the target directory', () => {
    expect(() =>
      extractTar(tarOf(ustarEntry('../outside.js', 'x')), dir)
    ).toThrow('Unsafe path');
    expect(fs.existsSync(path.join(dir, '..', 'outside.js'))).toBe(false);
  });

  it('skips links instead of following them', () => {
    extractTar(tarOf(ustarEntry('./link', '', '2')), dir);

    expect(fs.existsSync(path.join(dir, 'link'))).toBe(false);
  });
});
