import { expect } from 'chai';
import { Notification } from 'electron';
import notifications from './notifications';
const { describe, it } = global;

describe('notifications', () => {
	it('create', () => {
		expect(notifications.create({})).to.be.instanceOf(Notification);
	});

	it('create with icon', () => {
		const icon = 'data:image/png;base64,' +
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
		expect(notifications.create({ icon })).to.be.instanceOf(Notification);
	});
});
