import { getAppIconPath, getTrayIconPath } from './icons';

it('app', () => {
  expect(getAppIconPath()).toMatch(/images\/icon\.png$/);
});

describe('tray', () => {
  it.each([
    ['darwin', false],
    ['darwin-dark', true],
    ['linux', undefined],
    ['win32', undefined],
  ])('find icon path', (platform, dark) => {
    expect(getTrayIconPath({ platform, dark })).toMatch(new RegExp(`images/tray/${ platform }/default.(png|ico)$`));
    expect(getTrayIconPath({ badge: '•', platform, dark })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-dot).(png|ico)$`));
    expect(getTrayIconPath({ badge: 1, platform, dark })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-1).(png|ico)$`));
    expect(getTrayIconPath({ badge: 2, platform, dark })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-2).(png|ico)$`));
    expect(getTrayIconPath({ badge: 3, platform, dark })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-3).(png|ico)$`));
    expect(getTrayIconPath({ badge: 4, platform, dark })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-4).(png|ico)$`));
    expect(getTrayIconPath({ badge: 5, platform, dark })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-5).(png|ico)$`));
    expect(getTrayIconPath({ badge: 6, platform, dark })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-6).(png|ico)$`));
    expect(getTrayIconPath({ badge: 7, platform, dark })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-7).(png|ico)$`));
    expect(getTrayIconPath({ badge: 8, platform, dark })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-8).(png|ico)$`));
    expect(getTrayIconPath({ badge: 9, platform, dark })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-9).(png|ico)$`));
    expect(getTrayIconPath({ badge: 10, platform, dark })).toMatch(new RegExp(`images/tray/${ platform }/(notification|notification-plus-9).(png|ico)$`));
  });
});
