import { getAppIconPath, getTrayIconPath } from './icons';

it('app', () => {
  expect(getAppIconPath()).toMatch(/images\/icon\.png$/);
});

describe('getTrayIconPath', () => {
  it('matches path for darwin platform', () => {
    expect(getTrayIconPath({ platform: 'darwin' })).toMatch(new RegExp('images/tray/darwin/defaultTemplate.png$'));
    expect(getTrayIconPath({ platform: 'darwin', badge: '•' })).toMatch(new RegExp('images/tray/darwin/notificationTemplate.png$'));
    expect(getTrayIconPath({ platform: 'darwin', badge: 1 })).toMatch(new RegExp('images/tray/darwin/notificationTemplate.png$'));
    expect(getTrayIconPath({ platform: 'darwin', badge: 2 })).toMatch(new RegExp('images/tray/darwin/notificationTemplate.png$'));
    expect(getTrayIconPath({ platform: 'darwin', badge: 3 })).toMatch(new RegExp('images/tray/darwin/notificationTemplate.png$'));
    expect(getTrayIconPath({ platform: 'darwin', badge: 4 })).toMatch(new RegExp('images/tray/darwin/notificationTemplate.png$'));
    expect(getTrayIconPath({ platform: 'darwin', badge: 5 })).toMatch(new RegExp('images/tray/darwin/notificationTemplate.png$'));
    expect(getTrayIconPath({ platform: 'darwin', badge: 6 })).toMatch(new RegExp('images/tray/darwin/notificationTemplate.png$'));
    expect(getTrayIconPath({ platform: 'darwin', badge: 7 })).toMatch(new RegExp('images/tray/darwin/notificationTemplate.png$'));
    expect(getTrayIconPath({ platform: 'darwin', badge: 8 })).toMatch(new RegExp('images/tray/darwin/notificationTemplate.png$'));
    expect(getTrayIconPath({ platform: 'darwin', badge: 9 })).toMatch(new RegExp('images/tray/darwin/notificationTemplate.png$'));
    expect(getTrayIconPath({ platform: 'darwin', badge: 10 })).toMatch(new RegExp('images/tray/darwin/notificationTemplate.png$'));
  });

  it.each([
    ['linux'],
    ['win32'],
  ])('find icon path', (platform) => {
    expect(getTrayIconPath({ platform })).toMatch(new RegExp(`images/tray/${ platform }/default.(png|ico)$`));
    expect(getTrayIconPath({ badge: '•', platform })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-dot).(png|ico)$`));
    expect(getTrayIconPath({ badge: 1, platform })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-1).(png|ico)$`));
    expect(getTrayIconPath({ badge: 2, platform })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-2).(png|ico)$`));
    expect(getTrayIconPath({ badge: 3, platform })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-3).(png|ico)$`));
    expect(getTrayIconPath({ badge: 4, platform })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-4).(png|ico)$`));
    expect(getTrayIconPath({ badge: 5, platform })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-5).(png|ico)$`));
    expect(getTrayIconPath({ badge: 6, platform })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-6).(png|ico)$`));
    expect(getTrayIconPath({ badge: 7, platform })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-7).(png|ico)$`));
    expect(getTrayIconPath({ badge: 8, platform })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-8).(png|ico)$`));
    expect(getTrayIconPath({ badge: 9, platform })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-9).(png|ico)$`));
    expect(getTrayIconPath({ badge: 10, platform })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-plus-9).(png|ico)$`));
  });
});
