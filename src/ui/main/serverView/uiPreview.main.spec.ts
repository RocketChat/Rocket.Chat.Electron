import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { net } from 'electron';

import { dispatch, select } from '../../../store';
import {
  UI_PREVIEW_HISTORY_ENTRY_ADDED,
  UI_PREVIEW_HISTORY_ENTRY_UPDATED,
} from '../../actions';
import type { UiPreviewHistoryEntry } from '../../common';
import {
  askForUiOverride,
  warnAboutUiOverrideRequiresDeveloperMode,
  warnAboutUiPreviewFailure,
} from '../dialogs';
import {
  applyUiOverride,
  getUiOverride,
  getUiOverrideBundleUrls,
  getUiOverrideServerUrls,
  getUiOverrideVersion,
} from './uiOverride';
import {
  addUiPreview,
  parseUiPreviewFlag,
  parseUiPreviewInput,
  refreshUiPreview,
  resolveUiPreviewSource,
  updateUiPreviewWithDialog,
} from './uiPreview';
import {
  inspectUiPreview,
  pruneUiPreviews,
  pullUiPreview,
} from './uiPreviewPackage';

jest.mock('../../../store', () => ({ dispatch: jest.fn(), select: jest.fn() }));
jest.mock('../dialogs', () => ({
  askForUiOverride: jest.fn(),
  warnAboutUiOverrideRequiresDeveloperMode: jest.fn(),
  warnAboutUiPreviewFailure: jest.fn(),
}));
jest.mock('./uiOverride', () => ({
  applyUiOverride: jest.fn(),
  clearUiOverride: jest.fn(),
  getUiOverride: jest.fn(),
  getUiOverrideBundleUrls: jest.fn(() => []),
  getUiOverrideServerUrls: jest.fn(() => []),
  getUiOverrideVersion: jest.fn(),
}));
jest.mock('./uiPreviewPackage', () => ({
  ...jest.requireActual('./uiPreviewPackage'),
  inspectUiPreview: jest.fn(),
  pruneUiPreviews: jest.fn(async () => undefined),
  pullUiPreview: jest.fn(),
}));

const digestOf = (char: string) => `sha256:${char.repeat(64)}`;

describe('parseUiPreviewInput', () => {
  it('reads a PR number, with or without #', () => {
    expect(parseUiPreviewInput(' 42364 ')).toEqual({ pr: '42364' });
    expect(parseUiPreviewInput('#42364')).toEqual({ pr: '42364' });
  });

  it('reads develop, in any case', () => {
    expect(parseUiPreviewInput(' Develop ')).toEqual({ develop: true });
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

  it('labels the develop build with its ghcr.io reference', () => {
    expect(resolveUiPreviewSource({ develop: true })?.label).toBe(
      'develop (ghcr.io/rocketchat/rocket.chat-web:develop)'
    );
  });

  it('names the commit of a pulled build once it is loaded', async () => {
    const dir = path.resolve('ui-previews', 'a'.repeat(64));
    (pullUiPreview as jest.Mock).mockResolvedValue({
      dir,
      digest: digestOf('a'),
      revision: 'b4560f630e424ecbe109789991494988c046fb26',
    });

    await expect(
      resolveUiPreviewSource({ develop: true })?.load()
    ).resolves.toEqual({
      url: pathToFileURL(dir).href,
      label: 'develop @ b4560f6 (ghcr.io/rocketchat/rocket.chat-web:develop)',
      version: digestOf('a'),
    });
    expect(pullUiPreview).toHaveBeenCalledWith('develop');
  });

  it('updates the commit and date the history lists once a build is pulled', async () => {
    (pullUiPreview as jest.Mock).mockResolvedValue({
      dir: path.resolve('ui-previews', 'a'.repeat(64)),
      digest: digestOf('a'),
      revision: 'b4560f630e424ecbe109789991494988c046fb26',
      createdAt: '2026-10-05T13:39:01.000Z',
    });

    await resolveUiPreviewSource({ pr: '42364' })?.load();

    expect(dispatch).toHaveBeenCalledWith({
      type: UI_PREVIEW_HISTORY_ENTRY_UPDATED,
      payload: {
        input: '42364',
        label: 'PR #42364',
        digest: digestOf('a'),
        revision: 'b4560f630e424ecbe109789991494988c046fb26',
        createdAt: '2026-10-05T13:39:01.000Z',
      },
    });
  });

  it('keys each source by the input that loads it again', () => {
    expect(resolveUiPreviewSource({ develop: true })?.key).toBe('develop');
    expect(resolveUiPreviewSource({ pr: '42364' })?.key).toBe('42364');
    expect(
      resolveUiPreviewSource({ pr: '42364', sha: 'e'.repeat(40) })?.key
    ).toBe(`42364@${'e'.repeat(40)}`);
    expect(
      resolveUiPreviewSource({ bundle: 'http://127.0.0.1:4173' })?.key
    ).toBe('http://127.0.0.1:4173/');
  });

  it('keeps the plain label when the build recorded no commit', async () => {
    (pullUiPreview as jest.Mock).mockResolvedValue({
      dir: path.resolve('ui-previews', 'b'.repeat(64)),
    });

    expect((await resolveUiPreviewSource({ pr: '42364' })?.load())?.label).toBe(
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

describe('parseUiPreviewFlag', () => {
  it('reads a bare develop, true or 1 as set', () => {
    expect(
      parseUiPreviewFlag(new URLSearchParams('develop&host=x').get('develop'))
    ).toBe(true);
    expect(parseUiPreviewFlag('true')).toBe(true);
    expect(parseUiPreviewFlag('TRUE')).toBe(true);
    expect(parseUiPreviewFlag('1')).toBe(true);
  });

  it('reads an absent flag and any other value as unset', () => {
    expect(parseUiPreviewFlag(null)).toBe(false);
    expect(parseUiPreviewFlag('false')).toBe(false);
    expect(parseUiPreviewFlag('0')).toBe(false);
    expect(parseUiPreviewFlag('no')).toBe(false);
  });
});

describe('updateUiPreviewWithDialog', () => {
  const url = 'https://a.example.com/';
  const source = { label: 'develop', load: jest.fn() };

  const setDeveloperMode = (isDeveloperModeEnabled: boolean) =>
    (select as jest.Mock).mockImplementation((selector) =>
      selector({ isDeveloperModeEnabled })
    );

  beforeEach(() => {
    jest.clearAllMocks();
    setDeveloperMode(true);
    (getUiOverride as jest.Mock).mockReturnValue(source);
    (applyUiOverride as jest.Mock).mockResolvedValue('develop @ b4560f6');
    (getUiOverrideBundleUrls as jest.Mock).mockReturnValue([]);
  });

  it('loads the shown source again without asking', async () => {
    await updateUiPreviewWithDialog(url);

    expect(applyUiOverride).toHaveBeenCalledWith(url, source);
    expect(askForUiOverride).not.toHaveBeenCalled();
    expect(warnAboutUiPreviewFailure).not.toHaveBeenCalled();
  });

  it('starts the pull within the click, so a restore clicked after it wins', () => {
    const update = updateUiPreviewWithDialog(url);

    expect(applyUiOverride).toHaveBeenCalledWith(url, source);
    return update;
  });

  it('needs Developer Mode, like the other ways in', async () => {
    setDeveloperMode(false);

    await updateUiPreviewWithDialog(url);

    expect(warnAboutUiOverrideRequiresDeveloperMode).toHaveBeenCalled();
    expect(applyUiOverride).not.toHaveBeenCalled();
  });

  it('does nothing once the preview was restored', async () => {
    (getUiOverride as jest.Mock).mockReturnValue(undefined);

    await updateUiPreviewWithDialog(url);

    expect(applyUiOverride).not.toHaveBeenCalled();
    expect(warnAboutUiPreviewFailure).not.toHaveBeenCalled();
  });

  it('drops a click while a pull for the same server is running', async () => {
    let finish: (label: string) => void = () => undefined;
    (applyUiOverride as jest.Mock).mockReturnValueOnce(
      new Promise<string>((resolve) => {
        finish = resolve;
      })
    );

    const first = updateUiPreviewWithDialog(url);
    await updateUiPreviewWithDialog(url);
    finish('develop @ b4560f6');
    await first;
    await updateUiPreviewWithDialog(url);

    expect(applyUiOverride).toHaveBeenCalledTimes(2);
  });

  it('reports a failed pull in a dialog', async () => {
    (applyUiOverride as jest.Mock).mockRejectedValue(
      new Error('ghcr.io responded 503')
    );

    await updateUiPreviewWithDialog(url);

    expect(warnAboutUiPreviewFailure).toHaveBeenCalledWith(
      'ghcr.io responded 503'
    );
  });

  it('removes the bundles no workspace uses once the update is shown', async () => {
    const local = `${pathToFileURL(path.resolve('ui-previews', 'c'.repeat(64))).href}/`;
    (getUiOverrideBundleUrls as jest.Mock).mockReturnValue([
      local,
      'http://127.0.0.1:4173/',
    ]);

    await updateUiPreviewWithDialog(url);

    expect(pruneUiPreviews).toHaveBeenCalledWith([fileURLToPath(local)]);
  });

  it('leaves the bundles alone when a restore overtook the update', async () => {
    (applyUiOverride as jest.Mock).mockResolvedValue(null);

    await updateUiPreviewWithDialog(url);

    expect(pruneUiPreviews).not.toHaveBeenCalled();
    expect(warnAboutUiPreviewFailure).not.toHaveBeenCalled();
  });

  it('still shows the update when removing old bundles fails', async () => {
    (pruneUiPreviews as jest.Mock).mockRejectedValueOnce(new Error('EBUSY'));

    await updateUiPreviewWithDialog(url);

    expect(warnAboutUiPreviewFailure).not.toHaveBeenCalled();
  });
});

describe('addUiPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('lists a PR build once its manifest is read', async () => {
    (inspectUiPreview as jest.Mock).mockResolvedValue({
      digest: digestOf('a'),
      revision: 'eb79e9cf6173af43cd3aee956da47732539f5e4d',
      createdAt: '2026-10-05T13:12:00.000Z',
    });

    await expect(addUiPreview('#42364')).resolves.toEqual({ status: 'added' });

    expect(inspectUiPreview).toHaveBeenCalledWith('pr-42364');
    expect(pullUiPreview).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({
      type: UI_PREVIEW_HISTORY_ENTRY_ADDED,
      payload: {
        input: '42364',
        label: 'PR #42364',
        digest: digestOf('a'),
        revision: 'eb79e9cf6173af43cd3aee956da47732539f5e4d',
        createdAt: '2026-10-05T13:12:00.000Z',
      },
    });
  });

  it('lists nothing when the registry has no such build', async () => {
    (inspectUiPreview as jest.Mock).mockRejectedValue(
      new Error('ghcr.io/rocketchat/rocket.chat-web:pr-1 was not found')
    );

    await expect(addUiPreview('1')).resolves.toEqual({
      status: 'failed',
      message: 'ghcr.io/rocketchat/rocket.chat-web:pr-1 was not found',
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('refuses input that is not a source without asking the network', async () => {
    const fetch = jest.spyOn(net, 'fetch');

    await expect(addUiPreview('file:///etc/')).resolves.toEqual({
      status: 'failed',
      message: 'Not develop, a PR number or an http(s) URL: file:///etc/',
    });
    expect(inspectUiPreview).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('lists a served bundle once its index.html answers', async () => {
    const fetch = jest
      .spyOn(net, 'fetch')
      .mockResolvedValue(new Response('<html></html>'));

    await expect(addUiPreview('http://127.0.0.1:4173')).resolves.toEqual({
      status: 'added',
    });

    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:4173/index.html', {
      cache: 'no-store',
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: UI_PREVIEW_HISTORY_ENTRY_ADDED,
      payload: {
        input: 'http://127.0.0.1:4173/',
        label: 'http://127.0.0.1:4173/',
      },
    });
  });

  it('lists nothing when a served bundle does not answer', async () => {
    jest
      .spyOn(net, 'fetch')
      .mockResolvedValue(new Response('', { status: 404 }));

    expect((await addUiPreview('http://127.0.0.1:4173/')).status).toBe(
      'failed'
    );
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('refreshUiPreview', () => {
  const url = 'https://a.example.com/';
  const source = { key: '42364', label: 'PR #42364', load: jest.fn() };
  const listed: UiPreviewHistoryEntry = {
    input: '42364',
    label: 'PR #42364',
    digest: digestOf('a'),
  };

  const setHistory = (uiPreviewHistory: UiPreviewHistoryEntry[]) =>
    (select as jest.Mock).mockImplementation((selector) =>
      selector({ isDeveloperModeEnabled: true, uiPreviewHistory })
    );

  const publish = (char: string) =>
    (inspectUiPreview as jest.Mock).mockResolvedValue({
      digest: digestOf(char),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    setHistory([listed]);
    (getUiOverride as jest.Mock).mockReturnValue(source);
    (getUiOverrideServerUrls as jest.Mock).mockReturnValue([]);
    (getUiOverrideVersion as jest.Mock).mockReturnValue(undefined);
    (getUiOverrideBundleUrls as jest.Mock).mockReturnValue([]);
    (applyUiOverride as jest.Mock).mockResolvedValue('PR #42364 @ 760b6b6');
  });

  it('says so when nothing newer was published', async () => {
    publish('a');

    await expect(refreshUiPreview('42364')).resolves.toEqual({
      status: 'current',
    });
    expect(applyUiOverride).not.toHaveBeenCalled();
  });

  it('lists a newer build without loading it where the entry is not applied', async () => {
    publish('b');

    await expect(refreshUiPreview('42364')).resolves.toEqual({
      status: 'updated',
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: UI_PREVIEW_HISTORY_ENTRY_UPDATED,
      payload: { input: '42364', label: 'PR #42364', digest: digestOf('b') },
    });
    expect(applyUiOverride).not.toHaveBeenCalled();
  });

  it('loads a newer build into the workspace running the entry, without asking', async () => {
    publish('b');
    (getUiOverrideServerUrls as jest.Mock).mockReturnValue([url]);
    (getUiOverrideVersion as jest.Mock).mockReturnValue(digestOf('a'));

    await expect(refreshUiPreview('42364')).resolves.toEqual({
      status: 'updated',
    });
    expect(getUiOverrideServerUrls).toHaveBeenCalledWith('42364');
    expect(applyUiOverride).toHaveBeenCalledWith(url, source);
    expect(askForUiOverride).not.toHaveBeenCalled();
  });

  it('leaves a workspace alone when it already runs the newest build', async () => {
    publish('b');
    setHistory([{ ...listed, digest: digestOf('b') }]);
    (getUiOverrideServerUrls as jest.Mock).mockReturnValue([url]);
    (getUiOverrideVersion as jest.Mock).mockReturnValue(digestOf('b'));

    await expect(refreshUiPreview('42364')).resolves.toEqual({
      status: 'current',
    });
    expect(applyUiOverride).not.toHaveBeenCalled();
  });

  it('reports a newer build that failed to load', async () => {
    publish('b');
    (getUiOverrideServerUrls as jest.Mock).mockReturnValue([url]);
    (applyUiOverride as jest.Mock).mockRejectedValue(
      new Error('failed digest check')
    );

    await expect(refreshUiPreview('42364')).resolves.toEqual({
      status: 'failed',
      message: 'failed digest check',
    });
  });

  it('waits for a pull already running on the workspace, then reloads it if it is still behind', async () => {
    publish('b');
    (getUiOverrideServerUrls as jest.Mock).mockReturnValue([url]);
    (getUiOverrideVersion as jest.Mock).mockReturnValue(digestOf('a'));
    let finishRunning: (label: string) => void = () => undefined;
    (applyUiOverride as jest.Mock).mockReturnValueOnce(
      new Promise<string>((resolve) => {
        finishRunning = resolve;
      })
    );
    const running = updateUiPreviewWithDialog(url);

    const refresh = refreshUiPreview('42364');
    await new Promise((resolve) => setImmediate(resolve));
    expect(applyUiOverride).toHaveBeenCalledTimes(1);
    finishRunning('PR #42364 @ e38ea69');
    await running;

    await expect(refresh).resolves.toEqual({ status: 'updated' });
    expect(applyUiOverride).toHaveBeenCalledTimes(2);
  });

  it('does not reload a workspace the running pull already brought to the build', async () => {
    publish('b');
    (getUiOverrideServerUrls as jest.Mock).mockReturnValue([url]);
    let version = digestOf('a');
    (getUiOverrideVersion as jest.Mock).mockImplementation(() => version);
    let finishRunning: (label: string) => void = () => undefined;
    (applyUiOverride as jest.Mock).mockReturnValueOnce(
      new Promise<string>((resolve) => {
        finishRunning = resolve;
      })
    );
    const running = updateUiPreviewWithDialog(url);

    const refresh = refreshUiPreview('42364');
    await new Promise((resolve) => setImmediate(resolve));
    version = digestOf('b');
    finishRunning('PR #42364 @ 760b6b6');
    await running;

    await expect(refresh).resolves.toEqual({ status: 'updated' });
    expect(applyUiOverride).toHaveBeenCalledTimes(1);
  });

  it('does not report a reload that a restore cancelled', async () => {
    publish('b');
    let restored = false;
    (getUiOverrideServerUrls as jest.Mock).mockImplementation(() =>
      restored ? [] : [url]
    );
    (applyUiOverride as jest.Mock).mockImplementation(async () => {
      restored = true;
      return null;
    });

    await expect(refreshUiPreview('42364')).resolves.toEqual({
      status: 'updated',
    });
  });

  it('reports a workspace left on an older build when its reload could not run', async () => {
    publish('b');
    (getUiOverrideServerUrls as jest.Mock).mockReturnValue([url]);
    (getUiOverrideVersion as jest.Mock).mockReturnValue(digestOf('a'));
    (getUiOverride as jest.Mock).mockReturnValue(undefined);

    await expect(refreshUiPreview('42364')).resolves.toEqual({
      status: 'failed',
      message: `${url} still runs an older build; refresh again`,
    });
  });

  it('reports a registry failure and keeps the listed build', async () => {
    (inspectUiPreview as jest.Mock).mockRejectedValue(
      new Error('ghcr.io responded 503')
    );

    await expect(refreshUiPreview('42364')).resolves.toEqual({
      status: 'failed',
      message: 'ghcr.io responded 503',
    });
    expect(dispatch).not.toHaveBeenCalled();
  });
});
