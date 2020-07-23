const { call } = require('redux-saga/effects');

const { setupDock } = require('./dock');
const { getPlatform } = require('../app');

describe('setupDock', () => {
	it('should not generate effects in win32 platform', () => {
		const gen = setupDock();

		expect(gen.next().value).toStrictEqual(call(getPlatform));
		expect(gen.next('win32').done).toBe(true);
	});

	it('should not generate effects in linux platform', () => {
		const gen = setupDock();

		expect(gen.next().value).toStrictEqual(call(getPlatform));
		expect(gen.next('linux').done).toBe(true);
	});

	it('should generate effects in darwin platform', () => {
		const gen = setupDock();

		expect(gen.next().value).toStrictEqual(call(getPlatform));
		expect(gen.next('darwin').done).toBe(false);
	});
});
