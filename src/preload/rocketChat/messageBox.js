import { ipcRenderer } from 'electron';

import { getServerUrl } from '.';

export const setupMessageBoxEvents = () => {
	const {
		formattingButtons,
		applyFormatting,
	} = window.require('/app/ui-message/client/messageBox/messageBoxFormatting');

	let focusedMessageBoxInput = null;

	document.addEventListener('focus', (event) => {
		if (!event.target.classList.contains('js-input-message')) {
			return;
		}

		focusedMessageBoxInput = event.target;
		const payload = {
			url: getServerUrl(),
			focused: true,
		};
		ipcRenderer.send('message-box-focus-changed', payload);
	}, true);

	document.addEventListener('blur', (event) => {
		if (!event.target.classList.contains('js-input-message')) {
			return;
		}

		focusedMessageBoxInput = null;
		const payload = {
			url: getServerUrl(),
			focused: false,
		};
		ipcRenderer.send('message-box-focus-changed', payload);
	}, true);

	ipcRenderer.addListener('format-button-touched', (_, buttonId) => {
		if (!focusedMessageBoxInput) {
			return;
		}

		const { pattern } = formattingButtons
			.filter(({ condition }) => !condition || condition())
			.find(({ label }) => label === buttonId) || {};

		applyFormatting(pattern, focusedMessageBoxInput);
	});
};
