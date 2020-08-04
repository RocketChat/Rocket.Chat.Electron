import { ipcRenderer } from 'electron';

import { getServerUrl } from '.';
import { SEND_MESSAGE_BOX_FOCUS_CHANGED, SEND_FORMAT_BUTTON_TOUCHED } from '../../ipc';

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
		ipcRenderer.send(SEND_MESSAGE_BOX_FOCUS_CHANGED, payload);
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
		ipcRenderer.send(SEND_MESSAGE_BOX_FOCUS_CHANGED, payload);
	}, true);

	ipcRenderer.addListener(SEND_FORMAT_BUTTON_TOUCHED, (_, buttonId) => {
		if (!focusedMessageBoxInput) {
			return;
		}

		const { pattern } = formattingButtons
			.filter(({ condition }) => !condition || condition())
			.find(({ label }) => label === buttonId) || {};

		applyFormatting(pattern, focusedMessageBoxInput);
	});
};
