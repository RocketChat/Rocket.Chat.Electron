import './branding/branding.js';
import { start } from './scripts/start';
import { remote } from 'electron';
const { app } = remote;

Bugsnag.metaData = {
	// platformId: app.process.platform,
	// platformArch: app.process.arch,
	// electronVersion: app.process.versions.electron,
	version: app.getVersion(),
	// platformVersion: cordova.platformVersion
	// build: appInfo.build
};

Bugsnag.appVersion = app.getVersion();

app.setAppUserModelId('chat.rocket');

window.$ = window.jQuery = require('./vendor/jquery-3.1.1');
start();
