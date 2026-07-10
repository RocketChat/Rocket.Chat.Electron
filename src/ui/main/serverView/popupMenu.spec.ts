import { Menu, clipboard } from 'electron';

import { isProtocolAllowed } from '../../../navigation/main';
import {
  SPELL_CHECKING_LANGUAGE_TOGGLED,
  SPELL_CHECKING_TOGGLED,
} from '../../../spellChecking/actions';
import { dispatch } from '../../../store';
import { openExternal } from '../../../utils/browserLauncher';
import { createPopupMenuForServerView } from './popupMenu';

jest.mock('electron', () => ({
  Menu: {
    buildFromTemplate: jest.fn((template: unknown[]) => ({ template })),
  },
  clipboard: {
    write: jest.fn(),
  },
}));

jest.mock('i18next', () => ({
  t: (key: string) => key,
}));

jest.mock('../../../navigation/main', () => ({
  isProtocolAllowed: jest.fn(),
}));

jest.mock('../../../store', () => ({
  dispatch: jest.fn(),
}));

jest.mock('../../../utils/browserLauncher', () => ({
  openExternal: jest.fn(),
}));

type MenuTemplateItem = {
  label?: string;
  type?: string;
  enabled?: boolean;
  checked?: boolean;
  submenu?: MenuTemplateItem[];
  click?: (event?: { checked?: boolean }) => void | Promise<void>;
};

const asMenuTemplate = (menu: Menu): Array<MenuTemplateItem> =>
  (menu as unknown as { template: Array<MenuTemplateItem> }).template;

const setProcessPlatform = (value: NodeJS.Platform): void => {
  Object.defineProperty(process, 'platform', {
    configurable: true,
    value,
  });
};

const createWebContents = (defaults?: {
  spellCheckerLanguages?: string[];
  availableSpellCheckerLanguages?: string[];
}) => ({
  session: {
    availableSpellCheckerLanguages:
      defaults?.availableSpellCheckerLanguages ?? [],
    getSpellCheckerLanguages: jest
      .fn()
      .mockReturnValue(defaults?.spellCheckerLanguages ?? []),
  },
  replaceMisspelling: jest.fn(),
  downloadURL: jest.fn(),
  copyImageAt: jest.fn(),
});

describe('createPopupMenuForServerView', () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    setProcessPlatform(originalPlatform);
  });

  it('builds editable menu with image/link entries and suggestion actions', async () => {
    setProcessPlatform('linux');

    const wc = createWebContents({
      availableSpellCheckerLanguages: ['en-US', 'fr'],
      spellCheckerLanguages: ['en-US'],
    });

    const menu = createPopupMenuForServerView(
      wc as never,
      {
        isEditable: true,
        dictionarySuggestions: [
          'alpha',
          'beta',
          'gamma',
          'delta',
          'epsilon',
          'zeta',
          'eta',
          'theta',
        ],
        mediaType: 'image',
        srcURL: 'https://example.test/image.png',
        x: 12,
        y: 34,
        linkURL: 'https://example.test/doc',
        linkText: 'Example',
        editFlags: {
          canUndo: true,
          canRedo: false,
          canCut: true,
          canCopy: true,
          canPaste: true,
          canSelectAll: true,
        },
      } as never
    );

    const template = asMenuTemplate(menu);

    expect(Menu.buildFromTemplate).toHaveBeenCalledTimes(1);
    expect(template[0]?.label).toBe('alpha');
    expect(template[0]?.click).toBeDefined();
    template[0]?.click?.();
    expect(wc.replaceMisspelling).toHaveBeenCalledWith('alpha');

    const moreSuggestionsItem = template.find(
      (entry) => entry.label === 'contextMenu.moreSpellingSuggestions'
    );
    expect(moreSuggestionsItem?.submenu?.length).toBe(2);
    moreSuggestionsItem?.submenu?.[0]?.click?.();
    expect(wc.replaceMisspelling).toHaveBeenCalledWith('eta');

    const saveImageItem = template.find(
      (entry) => entry.label === 'contextMenu.saveImageAs'
    );
    saveImageItem?.click?.();
    expect(wc.downloadURL).toHaveBeenCalledWith(
      'https://example.test/image.png'
    );

    const copyImageItem = template.find(
      (entry) => entry.label === 'contextMenu.copyImage'
    );
    copyImageItem?.click?.();
    expect(wc.copyImageAt).toHaveBeenCalledWith(12, 34);

    const spellLanguageMenu = template.find(
      (entry) => entry.label === 'contextMenu.spellingLanguages'
    );
    expect(spellLanguageMenu?.submenu?.map((entry) => entry.label)).toEqual([
      'en-US',
      'fr',
    ]);

    const openLink = template.find(
      (entry) => entry.label === 'contextMenu.openLink'
    )?.click;

    (isProtocolAllowed as jest.Mock).mockResolvedValue(true);
    await openLink?.();
    expect(isProtocolAllowed).toHaveBeenCalledWith('https://example.test/doc');
    expect(openExternal).toHaveBeenCalledWith('https://example.test/doc');

    const copyLinkText = template.find(
      (entry) => entry.label === 'contextMenu.copyLinkText'
    );
    copyLinkText?.click?.();
    expect(clipboard.write).toHaveBeenCalledWith({
      text: 'Example',
      bookmark: 'Example',
    });

    const copyLinkAddress = template.find(
      (entry) => entry.label === 'contextMenu.copyLinkAddress'
    );
    copyLinkAddress?.click?.();
    expect(clipboard.write).toHaveBeenCalledWith({
      text: 'https://example.test/doc',
      bookmark: 'Example',
    });

    expect(template[template.length - 1].label).toBe('contextMenu.selectAll');
  });

  it('shows the darwin spelling checkbox and ignores blocked links', async () => {
    setProcessPlatform('darwin');
    (isProtocolAllowed as jest.Mock).mockResolvedValue(false);

    const wc = createWebContents({
      availableSpellCheckerLanguages: ['en-US'],
      spellCheckerLanguages: [],
    });

    const menu = createPopupMenuForServerView(
      wc as never,
      {
        isEditable: true,
        dictionarySuggestions: undefined,
        mediaType: 'none',
        srcURL: 'https://example.test/image.png',
        x: 0,
        y: 0,
        linkURL: 'https://example.test',
        linkText: '',
        editFlags: {
          canUndo: false,
          canRedo: false,
          canCut: false,
          canCopy: false,
          canPaste: false,
          canSelectAll: false,
        },
      } as never
    );

    const template = asMenuTemplate(menu);

    const spellCheckbox = template.find(
      (entry) => entry.label === 'contextMenu.spelling'
    );

    expect(spellCheckbox).toMatchObject({ type: 'checkbox', checked: false });
    spellCheckbox?.click?.({ checked: true });
    expect(dispatch).toHaveBeenCalledWith({
      type: SPELL_CHECKING_TOGGLED,
      payload: true,
    });

    const linkHandler = template.find(
      (entry) => entry.label === 'contextMenu.openLink'
    )?.click as unknown as () => Promise<void>;

    expect(typeof linkHandler).toBe('function');
    await linkHandler();

    expect(openExternal).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({
      type: SPELL_CHECKING_TOGGLED,
      payload: true,
    });
  });

  it('opens allowed links and triggers copy actions', async () => {
    setProcessPlatform('linux');
    (isProtocolAllowed as jest.Mock).mockResolvedValue(true);

    const wc = createWebContents({
      availableSpellCheckerLanguages: ['en-US'],
      spellCheckerLanguages: ['en-US'],
    });

    const menu = createPopupMenuForServerView(
      wc as never,
      {
        isEditable: true,
        dictionarySuggestions: [],
        mediaType: 'none',
        srcURL: '',
        x: 0,
        y: 0,
        linkURL: 'https://example.test/resource',
        linkText: 'Example',
        editFlags: {
          canUndo: false,
          canRedo: true,
          canCut: false,
          canCopy: false,
          canPaste: true,
          canSelectAll: true,
        },
      } as never
    );

    const template = asMenuTemplate(menu);
    const openLink = template.find(
      (entry) => entry.label === 'contextMenu.openLink'
    )?.click as unknown as () => Promise<void>;

    const copyText = template.find(
      (entry) => entry.label === 'contextMenu.copyLinkText'
    )?.click as unknown as () => void;

    await openLink();
    copyText();

    expect(isProtocolAllowed).toHaveBeenCalledWith(
      'https://example.test/resource'
    );
    expect(openExternal).toHaveBeenCalledWith('https://example.test/resource');
    expect(clipboard.write).toHaveBeenCalledWith({
      text: 'Example',
      bookmark: 'Example',
    });
  });

  it('handles empty context menu branches without images, links, or suggestions', () => {
    setProcessPlatform('linux');

    const wc = createWebContents({
      availableSpellCheckerLanguages: [],
      spellCheckerLanguages: ['en-US'],
    });

    const menu = createPopupMenuForServerView(
      wc as never,
      {
        isEditable: true,
        dictionarySuggestions: [],
        availableSpellCheckerLanguages: ['en-US'],
        spellCheckerLanguages: ['en-US'],
        mediaType: 'none',
        srcURL: '',
        x: 0,
        y: 0,
        linkURL: undefined,
        linkText: undefined,
        editFlags: {
          canUndo: false,
          canRedo: false,
          canCut: false,
          canCopy: false,
          canPaste: false,
          canSelectAll: false,
        },
      } as never
    );

    const template = asMenuTemplate(menu);

    expect(template).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'contextMenu.noSpellingSuggestions' }),
        expect.objectContaining({ label: 'contextMenu.undo', enabled: false }),
        expect.objectContaining({
          label: 'contextMenu.selectAll',
          enabled: false,
        }),
      ])
    );
    expect(
      template.some((entry) => entry.label === 'contextMenu.saveImageAs')
    ).toBe(false);
    expect(
      template.some((entry) => entry.label === 'contextMenu.openLink')
    ).toBe(false);
  });

  it('skips spellchecking items when the context is not editable', () => {
    setProcessPlatform('linux');

    const wc = createWebContents({
      availableSpellCheckerLanguages: ['en-US'],
      spellCheckerLanguages: ['en-US'],
    });

    const menu = createPopupMenuForServerView(
      wc as never,
      {
        isEditable: false,
        dictionarySuggestions: ['alpha'],
        mediaType: 'none',
        srcURL: '',
        x: 0,
        y: 0,
        linkURL: undefined,
        linkText: undefined,
        editFlags: {
          canUndo: true,
          canRedo: true,
          canCut: true,
          canCopy: true,
          canPaste: true,
          canSelectAll: true,
        },
      } as never
    );

    const template = asMenuTemplate(menu);
    expect(
      template.some((entry) => entry.label === 'contextMenu.spellingLanguages')
    ).toBe(false);
    expect(
      template.some((entry) => entry.label === 'contextMenu.spelling')
    ).toBe(false);
    expect(
      template.some(
        (entry) => entry.label === 'contextMenu.noSpellingSuggestions'
      )
    ).toBe(false);
  });

  it('fires spell-check language toggles for non-darwin', () => {
    setProcessPlatform('linux');

    const wc = createWebContents({
      availableSpellCheckerLanguages: ['en-US', 'fr'],
      spellCheckerLanguages: ['en-US'],
    });

    const menu = createPopupMenuForServerView(
      wc as never,
      {
        isEditable: true,
        dictionarySuggestions: ['alpha', 'beta'],
        mediaType: 'none',
        srcURL: '',
        x: 0,
        y: 0,
        linkURL: '',
        linkText: '',
        editFlags: {
          canUndo: true,
          canRedo: true,
          canCut: true,
          canCopy: true,
          canPaste: true,
          canSelectAll: true,
        },
      } as never
    );

    const template = asMenuTemplate(menu);
    const languageMenu = template.find(
      (entry) => entry.label === 'contextMenu.spellingLanguages'
    );
    const english = languageMenu?.submenu?.find(
      (entry) => entry.label === 'en-US' && entry.type === 'checkbox'
    );
    const french = languageMenu?.submenu?.find(
      (entry) => entry.label === 'fr' && entry.type === 'checkbox'
    );

    expect(english?.checked).toBe(true);
    expect(french?.checked).toBe(false);

    english?.click?.({ checked: false });
    expect(dispatch).toHaveBeenCalledWith({
      type: SPELL_CHECKING_LANGUAGE_TOGGLED,
      payload: {
        name: 'en-US',
        enabled: false,
      },
    });
  });

  it('uses default edit flags and win32 redo shortcut', () => {
    setProcessPlatform('win32');
    const wc = createWebContents({
      availableSpellCheckerLanguages: ['en-US'],
      spellCheckerLanguages: [],
    });

    const menu = createPopupMenuForServerView(
      wc as never,
      {
        isEditable: true,
        dictionarySuggestions: [],
        mediaType: 'none',
        srcURL: '',
        x: 0,
        y: 0,
        linkURL: undefined,
        linkText: undefined,
        editFlags: {},
      } as never
    );

    const template = asMenuTemplate(menu);
    const redoItem = template.find(
      (entry) => entry.label === 'contextMenu.redo'
    );
    expect(redoItem).toMatchObject({
      accelerator: 'Control+Y',
      enabled: false,
    });
  });
});
