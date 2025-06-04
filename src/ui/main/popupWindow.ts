// ui/main/popupWindows.ts
import { BrowserWindow, ipcMain } from 'electron';

const chatPopupWindows: Record<string, BrowserWindow> = {};

export const createChatPopupWindow = (
  origin: string,
  chatPath: string
): void => {
  console.log('[main] createChatPopupWindow called with:', chatPath, origin);
  if (
    chatPopupWindows[`${origin}${chatPath}`] &&
    !chatPopupWindows[`${origin}${chatPath}`].isDestroyed()
  ) {
    chatPopupWindows[`${origin}${chatPath}`].focus();
    return;
  }

  const popup = new BrowserWindow({
    width: 800,
    height: 600,
    title: `Rocket.Chat - ${origin}${chatPath}`,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInSubFrames: true,
      contextIsolation: false,
      webviewTag: true,
      partition: 'persist:rocketchat',
    },
  });

  popup.loadURL(`${origin}${chatPath}`);

  // TODO -[x]画面サイズが変わったらハンバーガーボタンとか、いらない部分を消す
  popup.webContents.on('did-finish-load', () => {
    popup.webContents.insertCSS(`
    #sidebar-region {
      display: none !important;
    }
    .rcx-navbar {
      display: none !important;
    }
    [aria-label="Open sidebar"]{
      display: none !important;
    }
  `);
  });

  popup.on('closed', () => {
    delete chatPopupWindows[`${origin}${chatPath}`];
  });

  chatPopupWindows[`${origin}${chatPath}`] = popup;
};
// TODO -[x]ワークスペースを切り替えたときに全てのポップアップを消すようにする。これはeventで検知できるかな？
// TODO -[x]ウィンドウ閉じたときに削除はここだと思う。close event→すべてクリアって感じ？
export const setupChatPopupIpc = (): void => {
  ipcMain.handle('open-chat-popup', (_, origin: string, chatPath: string) => {
    createChatPopupWindow(origin, chatPath);
  });
};

// TODO -[]popup window を最前面にpin止めできるようにしたい
// まずはmenuバーにピン止めボタンを作る

// 全てのpopup ウィンドウを消す関数
// 他で呼び出して使う
export const closeAllChatPopups = (): void => {
  Object.values(chatPopupWindows).forEach((popup) => {
    if (!popup.isDestroyed()) popup.close();
  });
  Object.keys(chatPopupWindows).forEach((key) => delete chatPopupWindows[key]);
};
