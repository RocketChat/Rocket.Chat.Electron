import { BrowserWindow } from 'electron';

import { joinAsarPath } from './joinAsarPath';

export const extractLocalStorage = async (): Promise<
  Record<string, string>
> => {
  const tempWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: false,
      worldSafeExecuteJavaScript: true,
    },
  });

  try {
    tempWindow.loadFile(joinAsarPath('dummy.html'));

    await new Promise<void>((resolve) => {
      tempWindow.addListener('ready-to-show', () => {
        resolve();
      });
    });

    return tempWindow.webContents.executeJavaScript(`(() => {
      const data = ({...localStorage})
      localStorage.clear();
      return data;
    })()`);
  } catch (error) {
    console.error(error);
    return {};
  }
};
