import { shell } from 'electron';
import { start } from './scripts/start';
import './branding/branding.js';

window.$ = window.jQuery = require('./vendor/jquery-3.1.1');
start();

window.addEventListener('load', () => {
	document.addEventListener('click', (event) => {
		const anchorElement = event.target.closest('a[rel="noopener noreferrer"]');
		if (anchorElement) {
			shell.openExternal(anchorElement.href);
			event.preventDefault();
		}
	});
});
