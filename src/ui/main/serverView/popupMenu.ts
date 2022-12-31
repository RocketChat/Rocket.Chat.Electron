import {
  ContextMenuParams,
  MenuItemConstructorOptions,
  shell,
  clipboard,
  Menu,
  WebContents,
} from 'electron';
import i18next from 'i18next';

import { isProtocolAllowed } from '../../../navigation/main';
import {
  SPELL_CHECKING_LANGUAGE_TOGGLED,
  SPELL_CHECKING_TOGGLED,
} from '../../../spellChecking/actions';
import { dispatch } from '../../../store';

const t = i18next.t.bind(i18next);

const createSpellCheckingMenuTemplate = (
  serverViewWebContents: WebContents,
  { isEditable, dictionarySuggestions }: ContextMenuParams
): MenuItemConstructorOptions[] => {
  if (!isEditable) {
    return [];
  }

  const { availableSpellCheckerLanguages } = serverViewWebContents.session;
  const spellCheckerLanguages =
    serverViewWebContents.session.getSpellCheckerLanguages();

  return [
    ...(spellCheckerLanguages.length > 0 && dictionarySuggestions
      ? ([
          ...(dictionarySuggestions.length === 0
            ? [
                {
                  label: t('contextMenu.noSpellingSuggestions'),
                  enabled: false,
                },
              ]
            : dictionarySuggestions
                .slice(0, 6)
                .map<MenuItemConstructorOptions>((dictionarySuggestion) => ({
                  label: dictionarySuggestion,
                  click: () => {
                    serverViewWebContents.replaceMisspelling(
                      dictionarySuggestion
                    );
                  },
                }))),
          ...(dictionarySuggestions.length > 6
            ? [
                {
                  label: t('contextMenu.moreSpellingSuggestions'),
                  submenu: dictionarySuggestions
                    .slice(6)
                    .map<MenuItemConstructorOptions>(
                      (dictionarySuggestion) => ({
                        label: dictionarySuggestion,
                        click: () => {
                          serverViewWebContents.replaceMisspelling(
                            dictionarySuggestion
                          );
                        },
                      })
                    ),
                },
              ]
            : []),
          { type: 'separator' },
        ] as MenuItemConstructorOptions[])
      : []),
    ...((process.platform === 'darwin'
      ? [
          {
            label: t('contextMenu.spelling'),
            type: 'checkbox',
            checked: spellCheckerLanguages.length > 0,
            click: ({ checked }) => {
              dispatch({
                type: SPELL_CHECKING_TOGGLED,
                payload: checked,
              });
            },
          },
        ]
      : [
          {
            label: t('contextMenu.spellingLanguages'),
            enabled: availableSpellCheckerLanguages.length > 0,
            submenu: [
              ...availableSpellCheckerLanguages.map<MenuItemConstructorOptions>(
                (availableSpellCheckerLanguage) => ({
                  label: availableSpellCheckerLanguage,
                  type: 'checkbox',
                  checked: spellCheckerLanguages.includes(
                    availableSpellCheckerLanguage
                  ),
                  click: ({ checked }) => {
                    dispatch({
                      type: SPELL_CHECKING_LANGUAGE_TOGGLED,
                      payload: {
                        name: availableSpellCheckerLanguage,
                        enabled: checked,
                      },
                    });
                  },
                })
              ),
            ],
          },
        ]) as MenuItemConstructorOptions[]),
    { type: 'separator' },
  ];
};

const createImageMenuTemplate = (
  serverViewWebContents: WebContents,
  { mediaType, srcURL, x, y }: ContextMenuParams
): MenuItemConstructorOptions[] =>
  mediaType === 'image'
    ? [
        {
          label: t('contextMenu.saveImageAs'),
          click: () => serverViewWebContents.downloadURL(srcURL),
        },
        {
          label: t('contextMenu.copyImage'),
          click: () => serverViewWebContents.copyImageAt(x, y),
        },
        { type: 'separator' },
      ]
    : [];

const createLinkMenuTemplate = (
  _serverViewWebContents: WebContents,
  { linkURL, linkText }: ContextMenuParams
): MenuItemConstructorOptions[] =>
  linkURL
    ? [
        {
          label: t('contextMenu.openLink'),
          click: () => {
            isProtocolAllowed(linkURL).then((allowed) => {
              if (!allowed) {
                return;
              }

              shell.openExternal(linkURL);
            });
          },
        },
        {
          label: t('contextMenu.copyLinkText'),
          click: () => clipboard.write({ text: linkText, bookmark: linkText }),
          enabled: !!linkText,
        },
        {
          label: t('contextMenu.copyLinkAddress'),
          click: () => clipboard.write({ text: linkURL, bookmark: linkText }),
        },
        { type: 'separator' },
      ]
    : [];

const createDefaultMenuTemplate = (
  _serverViewWebContents: WebContents,
  {
    editFlags: {
      canUndo = false,
      canRedo = false,
      canCut = false,
      canCopy = false,
      canPaste = false,
      canSelectAll = false,
    },
  }: ContextMenuParams
): MenuItemConstructorOptions[] => [
  {
    label: t('contextMenu.undo'),
    role: 'undo',
    accelerator: 'CommandOrControl+Z',
    enabled: canUndo,
  },
  {
    label: t('contextMenu.redo'),
    role: 'redo',
    accelerator:
      process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
    enabled: canRedo,
  },
  { type: 'separator' },
  {
    label: t('contextMenu.cut'),
    role: 'cut',
    accelerator: 'CommandOrControl+X',
    enabled: canCut,
  },
  {
    label: t('contextMenu.copy'),
    role: 'copy',
    accelerator: 'CommandOrControl+C',
    enabled: canCopy,
  },
  {
    label: t('contextMenu.paste'),
    role: 'paste',
    accelerator: 'CommandOrControl+V',
    enabled: canPaste,
  },
  {
    label: t('contextMenu.selectAll'),
    role: 'selectAll',
    accelerator: 'CommandOrControl+A',
    enabled: canSelectAll,
  },
];

export const createPopupMenuForServerView = (
  serverViewWebContents: WebContents,
  params: ContextMenuParams
): Menu =>
  Menu.buildFromTemplate([
    ...createSpellCheckingMenuTemplate(serverViewWebContents, params),
    ...createImageMenuTemplate(serverViewWebContents, params),
    ...createLinkMenuTemplate(serverViewWebContents, params),
    ...createDefaultMenuTemplate(serverViewWebContents, params),
  ]);
