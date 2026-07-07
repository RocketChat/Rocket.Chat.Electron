import path from 'path';

import { getAppIconPath, getTrayIconPath } from './icons';

jest.mock('electron', () => ({
  app: {
    getAppPath: jest.fn(() => '/app'),
  },
}));

it('getAppIconPath', () => {
  expect(getAppIconPath({ platform: 'win32' })).toBe(
    path.join('/app', 'app', 'images', 'icon.ico')
  );
});

describe('getTrayIconPath', () => {
  it('matches path for darwin platform', () => {
    expect(getTrayIconPath({ platform: 'darwin' })).toBe(
      path.join(
        '/app',
        'app',
        'images',
        'tray',
        'darwin',
        'defaultTemplate.png'
      )
    );
    expect(getTrayIconPath({ platform: 'darwin', badge: '•' })).toBe(
      path.join(
        '/app',
        'app',
        'images',
        'tray',
        'darwin',
        'notificationTemplate.png'
      )
    );
    expect(getTrayIconPath({ platform: 'darwin', badge: 1 })).toBe(
      path.join(
        '/app',
        'app',
        'images',
        'tray',
        'darwin',
        'notificationTemplate.png'
      )
    );
    expect(getTrayIconPath({ platform: 'darwin', badge: 2 })).toBe(
      path.join(
        '/app',
        'app',
        'images',
        'tray',
        'darwin',
        'notificationTemplate.png'
      )
    );
    expect(getTrayIconPath({ platform: 'darwin', badge: 3 })).toBe(
      path.join(
        '/app',
        'app',
        'images',
        'tray',
        'darwin',
        'notificationTemplate.png'
      )
    );
    expect(getTrayIconPath({ platform: 'darwin', badge: 4 })).toBe(
      path.join(
        '/app',
        'app',
        'images',
        'tray',
        'darwin',
        'notificationTemplate.png'
      )
    );
    expect(getTrayIconPath({ platform: 'darwin', badge: 5 })).toBe(
      path.join(
        '/app',
        'app',
        'images',
        'tray',
        'darwin',
        'notificationTemplate.png'
      )
    );
    expect(getTrayIconPath({ platform: 'darwin', badge: 6 })).toBe(
      path.join(
        '/app',
        'app',
        'images',
        'tray',
        'darwin',
        'notificationTemplate.png'
      )
    );
    expect(getTrayIconPath({ platform: 'darwin', badge: 7 })).toBe(
      path.join(
        '/app',
        'app',
        'images',
        'tray',
        'darwin',
        'notificationTemplate.png'
      )
    );
    expect(getTrayIconPath({ platform: 'darwin', badge: 8 })).toBe(
      path.join(
        '/app',
        'app',
        'images',
        'tray',
        'darwin',
        'notificationTemplate.png'
      )
    );
    expect(getTrayIconPath({ platform: 'darwin', badge: 9 })).toBe(
      path.join(
        '/app',
        'app',
        'images',
        'tray',
        'darwin',
        'notificationTemplate.png'
      )
    );
    expect(getTrayIconPath({ platform: 'darwin', badge: 10 })).toBe(
      path.join(
        '/app',
        'app',
        'images',
        'tray',
        'darwin',
        'notificationTemplate.png'
      )
    );
  });

  it('matches path for win32 platform', () => {
    expect(getTrayIconPath({ platform: 'win32' })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'win32', 'default.ico')
    );
    expect(getTrayIconPath({ platform: 'win32', badge: '•' })).toBe(
      path.join(
        '/app',
        'app',
        'images',
        'tray',
        'win32',
        'notification-dot.ico'
      )
    );
    expect(getTrayIconPath({ platform: 'win32', badge: 1 })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'win32', 'notification-1.ico')
    );
    expect(getTrayIconPath({ platform: 'win32', badge: 2 })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'win32', 'notification-2.ico')
    );
    expect(getTrayIconPath({ platform: 'win32', badge: 3 })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'win32', 'notification-3.ico')
    );
    expect(getTrayIconPath({ platform: 'win32', badge: 4 })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'win32', 'notification-4.ico')
    );
    expect(getTrayIconPath({ platform: 'win32', badge: 5 })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'win32', 'notification-5.ico')
    );
    expect(getTrayIconPath({ platform: 'win32', badge: 6 })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'win32', 'notification-6.ico')
    );
    expect(getTrayIconPath({ platform: 'win32', badge: 7 })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'win32', 'notification-7.ico')
    );
    expect(getTrayIconPath({ platform: 'win32', badge: 8 })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'win32', 'notification-8.ico')
    );
    expect(getTrayIconPath({ platform: 'win32', badge: 9 })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'win32', 'notification-9.ico')
    );
    expect(getTrayIconPath({ platform: 'win32', badge: 10 })).toBe(
      path.join(
        '/app',
        'app',
        'images',
        'tray',
        'win32',
        'notification-plus-9.ico'
      )
    );
  });

  it('matches path for linux platform', () => {
    expect(getTrayIconPath({ platform: 'linux' })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'linux', 'default.png')
    );
    expect(getTrayIconPath({ platform: 'linux', badge: '•' })).toBe(
      path.join(
        '/app',
        'app',
        'images',
        'tray',
        'linux',
        'notification-dot.png'
      )
    );
    expect(getTrayIconPath({ platform: 'linux', badge: 1 })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'linux', 'notification-1.png')
    );
    expect(getTrayIconPath({ platform: 'linux', badge: 2 })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'linux', 'notification-2.png')
    );
    expect(getTrayIconPath({ platform: 'linux', badge: 3 })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'linux', 'notification-3.png')
    );
    expect(getTrayIconPath({ platform: 'linux', badge: 4 })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'linux', 'notification-4.png')
    );
    expect(getTrayIconPath({ platform: 'linux', badge: 5 })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'linux', 'notification-5.png')
    );
    expect(getTrayIconPath({ platform: 'linux', badge: 6 })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'linux', 'notification-6.png')
    );
    expect(getTrayIconPath({ platform: 'linux', badge: 7 })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'linux', 'notification-7.png')
    );
    expect(getTrayIconPath({ platform: 'linux', badge: 8 })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'linux', 'notification-8.png')
    );
    expect(getTrayIconPath({ platform: 'linux', badge: 9 })).toBe(
      path.join('/app', 'app', 'images', 'tray', 'linux', 'notification-9.png')
    );
    expect(getTrayIconPath({ platform: 'linux', badge: 10 })).toBe(
      path.join(
        '/app',
        'app',
        'images',
        'tray',
        'linux',
        'notification-plus-9.png'
      )
    );
  });
});
