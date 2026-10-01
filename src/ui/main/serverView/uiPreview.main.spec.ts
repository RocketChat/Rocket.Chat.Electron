import { select } from '../../../store';
import {
  askForUiOverride,
  warnAboutUiOverrideRequiresDeveloperMode,
  warnAboutUiPreviewFailure,
} from '../dialogs';
import { applyUiOverride, getUiOverride } from './uiOverride';
import {
  parseUiPreviewFlag,
  parseUiPreviewInput,
  resolveUiPreviewSource,
  updateUiPreviewWithDialog,
} from './uiPreview';

jest.mock('../../../store', () => ({ select: jest.fn() }));
jest.mock('../dialogs', () => ({
  askForUiOverride: jest.fn(),
  warnAboutUiOverrideRequiresDeveloperMode: jest.fn(),
  warnAboutUiPreviewFailure: jest.fn(),
}));
jest.mock('./uiOverride', () => ({
  applyUiOverride: jest.fn(),
  clearUiOverride: jest.fn(),
  getUiOverride: jest.fn(),
}));

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
    (applyUiOverride as jest.Mock).mockResolvedValue(true);
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
    let finish: (applied: boolean) => void = () => undefined;
    (applyUiOverride as jest.Mock).mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        finish = resolve;
      })
    );

    const first = updateUiPreviewWithDialog(url);
    await updateUiPreviewWithDialog(url);
    finish(true);
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
});
