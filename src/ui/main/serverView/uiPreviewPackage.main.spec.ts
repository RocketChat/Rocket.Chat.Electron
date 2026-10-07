import { createHash } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { gzipSync } from 'zlib';

import { app, net } from 'electron';

import {
  extractTar,
  inspectUiPreview,
  pruneUiPreviews,
  pullUiPreview,
  readUiPreviewPullRequest,
} from './uiPreviewPackage';

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

  it('writes files and directories of a ustar archive', async () => {
    await extractTar(
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

  it('refuses entries that escape the target directory', async () => {
    await expect(
      extractTar(tarOf(ustarEntry('../outside.js', 'x')), dir)
    ).rejects.toThrow('Unsafe path');
    expect(fs.existsSync(path.join(dir, '..', 'outside.js'))).toBe(false);
  });

  it('writes nothing from an archive with any unsafe entry', async () => {
    const target = path.join(dir, 'bundle');

    await expect(
      extractTar(
        tarOf(
          ustarEntry('./index.html', '<html></html>'),
          ustarEntry('../outside.js', 'x')
        ),
        target
      )
    ).rejects.toThrow('Unsafe path');
    expect(fs.existsSync(target)).toBe(false);
  });

  it('skips links instead of following them', async () => {
    await extractTar(tarOf(ustarEntry('./link', '', '2')), dir);

    expect(fs.existsSync(path.join(dir, 'link'))).toBe(false);
  });
});

describe('pullUiPreview', () => {
  let userData: string;

  beforeEach(() => {
    userData = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-preview-user-'));
    jest.spyOn(app, 'getPath').mockReturnValue(userData);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(userData, { recursive: true, force: true });
  });

  it('keeps a completed bundle when two pulls of one digest overlap', async () => {
    const blob = gzipSync(tarOf(ustarEntry('index.html', '<html></html>')));
    const hash = createHash('sha256').update(blob).digest('hex');
    const blobGates: Array<() => void> = [];
    let bothWaiting: () => void;
    const bothPullsMissedCache = new Promise<void>((resolve) => {
      bothWaiting = resolve;
    });
    jest.spyOn(net, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/token')) {
        return new Response(JSON.stringify({ token: 'anonymous' }));
      }
      if (url.includes('/manifests/')) {
        return new Response(
          JSON.stringify({ layers: [{ digest: `sha256:${hash}` }] })
        );
      }
      await new Promise<void>((resolve) => {
        blobGates.push(resolve);
        if (blobGates.length === 2) {
          bothWaiting();
        }
      });
      return new Response(blob);
    });

    const first = pullUiPreview('pr-1');
    const second = pullUiPreview('pr-1');
    await bothPullsMissedCache;

    blobGates[0]();
    const { dir } = await first;
    const index = path.join(dir, 'index.html');
    const { ino } = fs.statSync(index);

    blobGates[1]();
    expect((await second).dir).toBe(dir);
    expect(fs.statSync(index).ino).toBe(ino);
    expect(fs.readdirSync(path.dirname(dir))).toEqual([hash]);
  });

  const serveManifest = (manifest: object) =>
    jest
      .spyOn(net, 'fetch')
      .mockImplementation(async (input) =>
        String(input).includes('/token')
          ? new Response(JSON.stringify({ token: 'anonymous' }))
          : new Response(JSON.stringify(manifest))
      );

  const extractedBundle = (hash: string, usedAt: Date) => {
    const dir = path.join(userData, 'ui-previews', hash);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), '<html></html>');
    fs.utimesSync(dir, usedAt, usedAt);
    return dir;
  };

  it('reads the commit and date the bundle was built from', async () => {
    const hash = 'a'.repeat(64);
    extractedBundle(hash, new Date());
    serveManifest({
      annotations: {
        'org.opencontainers.image.created': '2026-10-05T13:39:01Z',
        'org.opencontainers.image.revision':
          'b4560f630e424ecbe109789991494988c046fb26',
      },
      layers: [{ digest: `sha256:${hash}` }],
    });

    await expect(pullUiPreview('develop')).resolves.toEqual({
      dir: path.join(userData, 'ui-previews', hash),
      digest: `sha256:${hash}`,
      revision: 'b4560f630e424ecbe109789991494988c046fb26',
      createdAt: '2026-10-05T13:39:01.000Z',
    });
  });

  it('ignores a revision annotation that is not a commit', async () => {
    const hash = 'b'.repeat(64);
    extractedBundle(hash, new Date());
    serveManifest({
      annotations: { 'org.opencontainers.image.revision': '<script>' },
      layers: [{ digest: `sha256:${hash}` }],
    });

    expect((await pullUiPreview('develop')).revision).toBeUndefined();
  });

  it('marks a reused bundle as recently used', async () => {
    const hash = 'c'.repeat(64);
    const dir = extractedBundle(hash, new Date('2026-01-01'));
    serveManifest({ layers: [{ digest: `sha256:${hash}` }] });

    await pullUiPreview('develop');

    expect(Date.now() - fs.statSync(dir).mtimeMs).toBeLessThan(60_000);
  });
});

describe('inspectUiPreview', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const serve = (manifest: Response) =>
    jest
      .spyOn(net, 'fetch')
      .mockImplementation(async (input) =>
        String(input).includes('/token')
          ? new Response(JSON.stringify({ token: 'anonymous' }))
          : manifest
      );

  it('reads a build from its manifest without downloading the bundle', async () => {
    const fetch = serve(
      new Response(
        JSON.stringify({
          annotations: {
            'org.opencontainers.image.created': '2026-10-05T13:39:01Z',
            'org.opencontainers.image.revision':
              '2bee37da3d2921b09545dbf73b1ca1434ef2d2d0',
          },
          layers: [{ digest: `sha256:${'d'.repeat(64)}` }],
        })
      )
    );

    await expect(inspectUiPreview('develop')).resolves.toEqual({
      digest: `sha256:${'d'.repeat(64)}`,
      revision: '2bee37da3d2921b09545dbf73b1ca1434ef2d2d0',
      createdAt: '2026-10-05T13:39:01.000Z',
    });
    expect(fetch.mock.calls.map(([input]) => String(input))).toEqual([
      'https://ghcr.io/token?scope=repository:rocketchat/rocket.chat-web:pull',
      'https://ghcr.io/v2/rocketchat/rocket.chat-web/manifests/develop',
    ]);
  });

  it('ignores a created annotation that is not a date', async () => {
    serve(
      new Response(
        JSON.stringify({
          annotations: { 'org.opencontainers.image.created': 'yesterday' },
          layers: [{ digest: `sha256:${'d'.repeat(64)}` }],
        })
      )
    );

    expect((await inspectUiPreview('develop')).createdAt).toBeUndefined();
  });

  it('names a tag the registry does not have', async () => {
    serve(new Response('{}', { status: 404 }));

    await expect(inspectUiPreview('pr-1')).rejects.toThrow(
      'ghcr.io/rocketchat/rocket.chat-web:pr-1 was not found'
    );
  });

  it('reports any other registry failure with its status', async () => {
    serve(new Response('', { status: 503 }));

    await expect(inspectUiPreview('develop')).rejects.toThrow('responded 503');
  });
});

describe('pruneUiPreviews', () => {
  let userData: string;
  let previews: string;

  const at = (daysAgo: number) =>
    new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  const makeDir = (name: string, usedAt: Date) => {
    const dir = path.join(previews, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.utimesSync(dir, usedAt, usedAt);
    return dir;
  };

  beforeEach(() => {
    userData = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-preview-user-'));
    previews = path.join(userData, 'ui-previews');
    jest.spyOn(app, 'getPath').mockReturnValue(userData);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(userData, { recursive: true, force: true });
  });

  it('keeps the bundles in use and the three most recent, removing the rest', async () => {
    const inUse = makeDir('1'.repeat(64), at(30));
    makeDir('2'.repeat(64), at(20));
    makeDir('3'.repeat(64), at(3));
    makeDir('4'.repeat(64), at(2));
    makeDir('5'.repeat(64), at(1));

    await pruneUiPreviews([`${inUse}/`]);

    expect(fs.readdirSync(previews).sort()).toEqual([
      '1'.repeat(64),
      '3'.repeat(64),
      '4'.repeat(64),
      '5'.repeat(64),
    ]);
  });

  it('removes an abandoned partial pull but not one still extracting', async () => {
    makeDir(`${'6'.repeat(64)}.partial-old`, at(1));
    makeDir(`${'7'.repeat(64)}.partial-live`, new Date());

    await pruneUiPreviews([]);

    expect(fs.readdirSync(previews)).toEqual([
      `${'7'.repeat(64)}.partial-live`,
    ]);
  });

  it('does nothing before the first pull', async () => {
    await expect(pruneUiPreviews([])).resolves.toBeUndefined();
  });
});

describe('readUiPreviewPullRequest', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const answer = (body: Record<string, unknown>) =>
    jest
      .spyOn(net, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(body)));

  it('reads the title and state of a Rocket.Chat PR from GitHub', async () => {
    const fetch = answer({
      title: ' ci: publish PR UI previews ',
      state: 'open',
      draft: false,
      merged_at: null,
    });

    await expect(readUiPreviewPullRequest('42364')).resolves.toEqual({
      title: 'ci: publish PR UI previews',
      state: 'open',
    });
    expect(String(fetch.mock.calls[0][0])).toBe(
      'https://api.github.com/repos/RocketChat/Rocket.Chat/pulls/42364'
    );
  });

  it.each([
    [{ state: 'open', draft: true, merged_at: null }, 'draft'],
    [
      { state: 'closed', draft: false, merged_at: '2026-09-30T21:38:39Z' },
      'merged',
    ],
    [{ state: 'closed', draft: false, merged_at: null }, 'closed'],
    [{ state: 'closed', draft: true, merged_at: null }, 'closed'],
  ])('reads %j as %s', async (fields, state) => {
    answer({ title: 'A title', ...fields });

    expect((await readUiPreviewPullRequest('1'))?.state).toBe(state);
  });

  it('reads nothing from an answer without a title', async () => {
    answer({ title: 42, state: 'open' });

    await expect(readUiPreviewPullRequest('1')).resolves.toBeUndefined();
  });

  it('gives up on a GitHub that does not answer in time', async () => {
    const timeout = jest
      .spyOn(AbortSignal, 'timeout')
      .mockReturnValue(AbortSignal.abort(new Error('timed out')));
    jest.spyOn(net, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          if (init?.signal?.aborted) {
            reject(init.signal.reason);
          }
        })
    );

    await expect(readUiPreviewPullRequest('1')).rejects.toThrow('timed out');
    expect(timeout).toHaveBeenCalledWith(5000);
  });

  it('fails when GitHub refuses, as it does past its rate limit', async () => {
    jest
      .spyOn(net, 'fetch')
      .mockResolvedValue(new Response('', { status: 403 }));

    await expect(readUiPreviewPullRequest('1')).rejects.toThrow(
      'responded 403'
    );
  });
});
