import { app } from 'electron';

export const whenReady = app.whenReady || (() => new Promise((resolve) => {
	app.isReady() ? resolve() : app.once('ready', () => resolve());
}));

export const whenReadyToShow =
	(window) => new Promise((resolve) => window.on('ready-to-show', resolve));
