import { remote } from 'electron';
import { t } from 'i18next';
import { useEffect, useState, useRef } from 'react';

import pkg from '../../package.json';
import {
	ABOUT_DIALOG_DISMISSED,
	ABOUT_DIALOG_TOGGLE_UPDATE_ON_START,
	ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED,
	UPDATES_NEW_VERSION_AVAILABLE,
	UPDATES_NEW_VERSION_NOT_AVAILABLE,
	UPDATES_CHECK_FAILED,
} from './actions.js';
import { subscribe } from './effects.js';

export function AboutDialog({
	appVersion = remote.app.getVersion(),
	copyright = pkg.copyright,
	canUpdate,
	canAutoUpdate,
	canSetAutoUpdate,
	root = document.querySelector('.about-dialog'),
	visible,
	dispatch,
}) {
	useEffect(() => {
		if (!visible) {
			root.close();
			return;
		}

		root.showModal();

		root.onclose = () => {
			root.close();
			dispatch({ type: ABOUT_DIALOG_DISMISSED });
		};

		root.onclick = ({ clientX, clientY }) => {
			const { left, top, width, height } = root.getBoundingClientRect();
			const isInDialog = top <= clientY && clientY <= top + height && left <= clientX && clientX <= left + width;
			if (!isInDialog) {
				root.close();
				dispatch({ type: ABOUT_DIALOG_DISMISSED });
			}
		};
	}, [visible]);

	const [checkingForUpdates, setCheckingForUpdates] = useState(false);
	const [checkingForUpdatesMessage, setCheckingForUpdatesMessage] = useState(null);

	const checkingForUpdatesMessageTimerRef = useRef();

	const displayCheckingForUpdatesMessage = (message) => {
		setCheckingForUpdatesMessage(message);

		clearTimeout(checkingForUpdatesMessageTimerRef.current);
		checkingForUpdatesMessageTimerRef.current = setTimeout(() => {
			setCheckingForUpdates(false);
			setCheckingForUpdatesMessage(null);
		}, 5000);
	};

	useEffect(() => {
		if (!canUpdate) {
			return;
		}

		const handleActionDispatched = ({ type }) => {
			switch (type) {
				case UPDATES_NEW_VERSION_AVAILABLE:
					setCheckingForUpdates(false);
					setCheckingForUpdatesMessage(null);
					break;

				case UPDATES_NEW_VERSION_NOT_AVAILABLE:
					displayCheckingForUpdatesMessage(t('dialog.about.noUpdatesAvailable'));
					break;

				case UPDATES_CHECK_FAILED:
					displayCheckingForUpdatesMessage(t('dialog.about.errorWhileLookingForUpdates'));
					break;
			}
		};

		return subscribe(handleActionDispatched);
	}, [canUpdate]);

	const handleCheckForUpdatesButtonClick = () => {
		setCheckingForUpdates(true);
		setCheckingForUpdatesMessage(null);
		dispatch({ type: ABOUT_DIALOG_CHECK_FOR_UPDATES_CLICKED });
	};

	const handleCheckForUpdatesOnStartCheckBoxChange = (event) => {
		dispatch({ type: ABOUT_DIALOG_TOGGLE_UPDATE_ON_START, payload: event.target.checked });
	};

	root.querySelector('.app-version').innerHTML = `${ t('dialog.about.version') } <span class="version">${ appVersion }</span>`;

	root.querySelector('.check-for-updates').innerText = t('dialog.about.checkUpdates');
	root.querySelector('.check-for-updates').onclick = handleCheckForUpdatesButtonClick;
	root.querySelector('.check-for-updates').toggleAttribute('disabled', checkingForUpdates);
	root.querySelector('.check-for-updates').classList.toggle('hidden', checkingForUpdates);

	root.querySelector('.checking-for-updates').classList.toggle('hidden', !checkingForUpdates);
	root.querySelector('.checking-for-updates').classList.toggle('message-shown', !!checkingForUpdatesMessage);

	root.querySelector('.checking-for-updates .message').innerText = checkingForUpdatesMessage || '';

	root.querySelector('.check-for-updates-on-start').toggleAttribute('checked', canAutoUpdate);
	root.querySelector('.check-for-updates-on-start').toggleAttribute('disabled', !canSetAutoUpdate);
	root.querySelector('.check-for-updates-on-start').onchange = handleCheckForUpdatesOnStartCheckBoxChange;

	root.querySelector('.check-for-updates-on-start + span').innerText = t('dialog.about.checkUpdatesOnStart');

	root.querySelector('.copyright').innerText = t('dialog.about.copyright', { copyright });

	root.querySelector('.updates').classList.toggle('hidden', !canUpdate);

	return null;
}
