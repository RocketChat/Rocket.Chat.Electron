import { dialog, BrowserWindow } from 'electron';
import i18next from 'i18next';

const t = i18next.t.bind(i18next);

export const askForAppDataReset = async (parentWindow: BrowserWindow): Promise<boolean> => {
	const { response } = await dialog.showMessageBox(parentWindow, {
		type: 'question',
		buttons: [t('dialog.resetAppData.yes'), t('dialog.resetAppData.cancel')],
		defaultId: 1,
		title: t('dialog.resetAppData.title'),
		message: t('dialog.resetAppData.message'),
	});

	return response === 0;
};

export const askForServerAddition = async (parentWindow: BrowserWindow, serverUrl: string): Promise<boolean> => {
	const { response } = await dialog.showMessageBox(parentWindow, {
		type: 'question',
		buttons: [t('dialog.addServer.add'), t('dialog.addServer.cancel')],
		defaultId: 0,
		title: t('dialog.addServer.title'),
		message: t('dialog.addServer.message', { host: serverUrl }),
	});

	return response === 0;
};

export const warnAboutInvalidServerUrl = (_parentWindow: BrowserWindow, _serverUrl: string, _reason: string): Promise<void> => {
	throw Error('not implemented');
};

export const browseForSpellCheckingDictionary = async (parentWindow: BrowserWindow): Promise<string[]> => {
	const { filePaths } = await dialog.showOpenDialog(parentWindow, {
		title: t('dialog.loadDictionary.title'),
		filters: [
			{ name: t('dialog.loadDictionary.dictionaries'), extensions: ['dic', 'aff'] },
			{ name: t('dialog.loadDictionary.allFiles'), extensions: ['*'] },
		],
		properties: ['openFile', 'multiSelections'],
	});

	return filePaths;
};

export const enum AskUpdateInstallResponse {
	INSTALL_LATER = 0,
	INSTALL_NOW = 1,
}

export const askUpdateInstall = async (parentWindow: BrowserWindow): Promise<AskUpdateInstallResponse> => {
	const { response } = await dialog.showMessageBox(parentWindow, {
		type: 'question',
		title: t('dialog.updateReady.title'),
		message: t('dialog.updateReady.message'),
		buttons: [
			t('dialog.updateReady.installLater'),
			t('dialog.updateReady.installNow'),
		],
		defaultId: 1,
	});

	if (response === 1) {
		return AskUpdateInstallResponse.INSTALL_NOW;
	}

	return AskUpdateInstallResponse.INSTALL_LATER;
};

export const warnAboutInstallUpdateLater = async (parentWindow: BrowserWindow): Promise<void> => {
	await dialog.showMessageBox(parentWindow, {
		type: 'info',
		title: t('dialog.updateInstallLater.title'),
		message: t('dialog.updateInstallLater.message'),
		buttons: [t('dialog.updateInstallLater.ok')],
		defaultId: 0,
	});
};

export enum AskForCertificateTrustResponse {
	YES = 0,
	NO = 1,
}

export const askForCertificateTrust = async (parentWindow: BrowserWindow, issuerName: string, detail: string): Promise<AskForCertificateTrustResponse> => {
	const { response } = await dialog.showMessageBox(parentWindow, {
		title: t('dialog.certificateError.title'),
		message: t('dialog.certificateError.message', { issuerName }),
		detail,
		type: 'warning',
		buttons: [
			t('dialog.certificateError.yes'),
			t('dialog.certificateError.no'),
		],
		cancelId: 1,
	});

	if (response === 0) {
		return AskForCertificateTrustResponse.YES;
	}

	return AskForCertificateTrustResponse.NO;
};

export const warnAboutUpdateDownload = async (rootWindow: BrowserWindow): Promise<void> => {
	await dialog.showMessageBox(rootWindow, {
		type: 'info',
		title: t('dialog.updateDownloading.title'),
		message: t('dialog.updateDownloading.message'),
		buttons: [t('dialog.updateDownloading.ok')],
		defaultId: 0,
	});
};

export const warnAboutUpdateSkipped = async (rootWindow: BrowserWindow): Promise<void> => {
	await dialog.showMessageBox(rootWindow, {
		type: 'warning',
		title: t('dialog.updateSkip.title'),
		message: t('dialog.updateSkip.message'),
		buttons: [t('dialog.updateSkip.ok')],
		defaultId: 0,
	});
};
