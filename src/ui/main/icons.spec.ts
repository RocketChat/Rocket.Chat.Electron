import { getAppIconPath, getTrayIconPath } from './icons';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toMatchAppPath(expected: string): R;
    }
  }
}

it('getAppIconPath', () => {
  expect(getAppIconPath({ platform: 'win32' })).toMatchAppPath(
    'images/icon.ico'
  );
});

describe('getTrayIconPath', () => {
  it('matches path for darwin platform', () => {
    expect(getTrayIconPath({ platform: 'darwin', visible: true })).toMatchAppPath(
      'images/tray/darwin/defaultTemplate.png'
    );
    expect(getTrayIconPath({ platform: 'darwin', visible: false })).toMatchAppPath(
      'images/tray/darwin/invisible.png'
    );
  });

  it('matches path for win32 platform', () => {
    expect(getTrayIconPath({ platform: 'win32', visible: true })).toMatchAppPath(
      'images/tray/win32/default.ico'
    );
    expect(getTrayIconPath({ platform: 'win32', visible: false })).toMatchAppPath(
      'images/tray/win32/invisible.ico'
    );
  });

  it('matches path for linux platform', () => {
    expect(getTrayIconPath({ platform: 'linux', visible: true })).toMatchAppPath(
      'images/tray/linux/default.png'
    );
    expect(getTrayIconPath({ platform: 'linux', visible: false })).toMatchAppPath(
      'images/tray/linux/invisible.png'
    );
  });
});
