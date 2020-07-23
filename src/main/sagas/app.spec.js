import { app } from 'electron';
import { call } from 'redux-saga/effects';

import { waitForAppReady, watchApp } from './app';

describe('waitForAppReady', () => {
	it('calls app.whenReady', () => {
		const gen = waitForAppReady();

		expect(gen.next().value).toStrictEqual(call(app.whenReady));
		expect(gen.next().done).toBe(true);
	});
});

describe('watchApp', () => {
	it('only perform forks', () => {
		const gen = watchApp();

		for (const value of gen) {
			expect(value.type).toBe('FORK');
		}
	});
});
