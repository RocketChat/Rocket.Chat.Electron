import { combineReducers } from 'redux';

import { currentServerUrl } from './currentServerUrl';
import { doCheckForUpdatesOnStartup } from './doCheckForUpdatesOnStartup';
import { installedSpellCheckingDictionariesDirectoryPath } from './installedSpellCheckingDictionariesDirectoryPath';
import { isCheckingForUpdates } from './isCheckingForUpdates';
import { isEachUpdatesSettingConfigurable } from './isEachUpdatesSettingConfigurable';
import { isHunspellSpellCheckerUsed } from './isHunspellSpellCheckerUsed';
import { isMessageBoxFocused } from './isMessageBoxFocused';
import { isUpdatingAllowed } from './isUpdatingAllowed';
import { isUpdatingEnabled } from './isUpdatingEnabled';
import { newUpdateVersion } from './newUpdateVersion';
import { openDialog } from './openDialog';
import { servers } from './servers';
import { skippedUpdateVersion } from './skippedUpdateVersion';
import { spellCheckingDictionaries } from './spellCheckingDictionaries';

export const rootReducer = combineReducers({
	currentServerUrl,
	doCheckForUpdatesOnStartup,
	installedSpellCheckingDictionariesDirectoryPath,
	isCheckingForUpdates,
	isEachUpdatesSettingConfigurable,
	isHunspellSpellCheckerUsed,
	isMessageBoxFocused,
	isUpdatingAllowed,
	isUpdatingEnabled,
	newUpdateVersion,
	openDialog,
	servers,
	skippedUpdateVersion,
	spellCheckingDictionaries,
});
