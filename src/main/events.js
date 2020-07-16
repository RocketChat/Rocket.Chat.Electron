import { app } from 'electron';

export const setupAppEvents = () => {
	const preventEvent = (event) => {
		event.preventDefault();
	};

	app.addListener('certificate-error', preventEvent);
	app.addListener('select-client-certificate', preventEvent);
	app.addListener('login', preventEvent);
	app.addListener('open-url', preventEvent);
	app.addListener('window-all-closed', () => {
		app.quit();
	});
};
