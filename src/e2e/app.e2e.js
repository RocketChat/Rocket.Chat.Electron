import { expect } from 'chai';
import { app, startApp, stopApp } from './utils';

import appManifest from '../../package.json';

describe('application', function() {
	before(startApp);
	after(stopApp);

	it('shows the main window', async function() {
		expect(await app.browserWindow.getTitle()).to.be.equals(appManifest.productName);
		expect(await app.browserWindow.isVisible()).to.be.true;
	});
});
