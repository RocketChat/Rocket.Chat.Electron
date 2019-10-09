import { expect } from 'chai';

import { getAppIconPath, getTrayIconPath, getAppIconImage, getTrayIconImage } from './icon';

const { describe, it } = global;


describe('icon', () => {
	describe('paths', () => {
		it('app', () => {
			expect(getAppIconPath()).to.be.equals('public/images/icon.png');
		});

		describe('tray', () => {
			it('darwin', () => {
				expect(getTrayIconPath({ platform: 'darwin', dark: false })).to.be.equals('public/images/tray/darwin/default.png');
				expect(getTrayIconPath({ badge: '•', platform: 'darwin', dark: false })).to.be.equals('public/images/tray/darwin/notification.png');
				expect(getTrayIconPath({ badge: 1, platform: 'darwin', dark: false })).to.be.equals('public/images/tray/darwin/notification.png');
				expect(getTrayIconPath({ badge: 2, platform: 'darwin', dark: false })).to.be.equals('public/images/tray/darwin/notification.png');
				expect(getTrayIconPath({ badge: 3, platform: 'darwin', dark: false })).to.be.equals('public/images/tray/darwin/notification.png');
				expect(getTrayIconPath({ badge: 4, platform: 'darwin', dark: false })).to.be.equals('public/images/tray/darwin/notification.png');
				expect(getTrayIconPath({ badge: 5, platform: 'darwin', dark: false })).to.be.equals('public/images/tray/darwin/notification.png');
				expect(getTrayIconPath({ badge: 6, platform: 'darwin', dark: false })).to.be.equals('public/images/tray/darwin/notification.png');
				expect(getTrayIconPath({ badge: 7, platform: 'darwin', dark: false })).to.be.equals('public/images/tray/darwin/notification.png');
				expect(getTrayIconPath({ badge: 8, platform: 'darwin', dark: false })).to.be.equals('public/images/tray/darwin/notification.png');
				expect(getTrayIconPath({ badge: 9, platform: 'darwin', dark: false })).to.be.equals('public/images/tray/darwin/notification.png');
				expect(getTrayIconPath({ badge: 10, platform: 'darwin', dark: false })).to.be.equals('public/images/tray/darwin/notification.png');
			});

			it('darwin-dark', () => {
				expect(getTrayIconPath({ platform: 'darwin', dark: true })).to.be.equals('public/images/tray/darwin-dark/default.png');
				expect(getTrayIconPath({ badge: '•', platform: 'darwin', dark: true })).to.be.equals('public/images/tray/darwin-dark/notification.png');
				expect(getTrayIconPath({ badge: 1, platform: 'darwin', dark: true })).to.be.equals('public/images/tray/darwin-dark/notification.png');
				expect(getTrayIconPath({ badge: 2, platform: 'darwin', dark: true })).to.be.equals('public/images/tray/darwin-dark/notification.png');
				expect(getTrayIconPath({ badge: 3, platform: 'darwin', dark: true })).to.be.equals('public/images/tray/darwin-dark/notification.png');
				expect(getTrayIconPath({ badge: 4, platform: 'darwin', dark: true })).to.be.equals('public/images/tray/darwin-dark/notification.png');
				expect(getTrayIconPath({ badge: 5, platform: 'darwin', dark: true })).to.be.equals('public/images/tray/darwin-dark/notification.png');
				expect(getTrayIconPath({ badge: 6, platform: 'darwin', dark: true })).to.be.equals('public/images/tray/darwin-dark/notification.png');
				expect(getTrayIconPath({ badge: 7, platform: 'darwin', dark: true })).to.be.equals('public/images/tray/darwin-dark/notification.png');
				expect(getTrayIconPath({ badge: 8, platform: 'darwin', dark: true })).to.be.equals('public/images/tray/darwin-dark/notification.png');
				expect(getTrayIconPath({ badge: 9, platform: 'darwin', dark: true })).to.be.equals('public/images/tray/darwin-dark/notification.png');
				expect(getTrayIconPath({ badge: 10, platform: 'darwin', dark: true })).to.be.equals('public/images/tray/darwin-dark/notification.png');
			});

			it('linux', () => {
				expect(getTrayIconPath({ platform: 'linux' })).to.be.equals('public/images/tray/linux/default.png');
				expect(getTrayIconPath({ badge: '•', platform: 'linux' })).to.be.equals('public/images/tray/linux/notification-dot.png');
				expect(getTrayIconPath({ badge: 1, platform: 'linux' })).to.be.equals('public/images/tray/linux/notification-1.png');
				expect(getTrayIconPath({ badge: 2, platform: 'linux' })).to.be.equals('public/images/tray/linux/notification-2.png');
				expect(getTrayIconPath({ badge: 3, platform: 'linux' })).to.be.equals('public/images/tray/linux/notification-3.png');
				expect(getTrayIconPath({ badge: 4, platform: 'linux' })).to.be.equals('public/images/tray/linux/notification-4.png');
				expect(getTrayIconPath({ badge: 5, platform: 'linux' })).to.be.equals('public/images/tray/linux/notification-5.png');
				expect(getTrayIconPath({ badge: 6, platform: 'linux' })).to.be.equals('public/images/tray/linux/notification-6.png');
				expect(getTrayIconPath({ badge: 7, platform: 'linux' })).to.be.equals('public/images/tray/linux/notification-7.png');
				expect(getTrayIconPath({ badge: 8, platform: 'linux' })).to.be.equals('public/images/tray/linux/notification-8.png');
				expect(getTrayIconPath({ badge: 9, platform: 'linux' })).to.be.equals('public/images/tray/linux/notification-9.png');
				expect(getTrayIconPath({ badge: 10, platform: 'linux' })).to.be.equals('public/images/tray/linux/notification-plus-9.png');
			});

			it('win32', () => {
				expect(getTrayIconPath({ platform: 'win32' })).to.be.equals('public/images/tray/win32/default.ico');
				expect(getTrayIconPath({ badge: '•', platform: 'win32' })).to.be.equals('public/images/tray/win32/notification-dot.ico');
				expect(getTrayIconPath({ badge: 1, platform: 'win32' })).to.be.equals('public/images/tray/win32/notification-1.ico');
				expect(getTrayIconPath({ badge: 2, platform: 'win32' })).to.be.equals('public/images/tray/win32/notification-2.ico');
				expect(getTrayIconPath({ badge: 3, platform: 'win32' })).to.be.equals('public/images/tray/win32/notification-3.ico');
				expect(getTrayIconPath({ badge: 4, platform: 'win32' })).to.be.equals('public/images/tray/win32/notification-4.ico');
				expect(getTrayIconPath({ badge: 5, platform: 'win32' })).to.be.equals('public/images/tray/win32/notification-5.ico');
				expect(getTrayIconPath({ badge: 6, platform: 'win32' })).to.be.equals('public/images/tray/win32/notification-6.ico');
				expect(getTrayIconPath({ badge: 7, platform: 'win32' })).to.be.equals('public/images/tray/win32/notification-7.ico');
				expect(getTrayIconPath({ badge: 8, platform: 'win32' })).to.be.equals('public/images/tray/win32/notification-8.ico');
				expect(getTrayIconPath({ badge: 9, platform: 'win32' })).to.be.equals('public/images/tray/win32/notification-9.ico');
				expect(getTrayIconPath({ badge: 10, platform: 'win32' })).to.be.equals('public/images/tray/win32/notification-plus-9.ico');
			});
		});
	});

	describe('image', () => {
		expect(getAppIconImage()).to.not.be.null;
		expect(getTrayIconImage()).to.not.be.null;
	});
});
