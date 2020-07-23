export const migratePreferences = (persistedValues, localStorage) => {
	if (localStorage.autohideMenu) {
		persistedValues.isMenuBarEnabled = localStorage.autohideMenu !== 'true';
	}

	if (localStorage.showWindowOnUnreadChanged) {
		persistedValues.isShowWindowOnUnreadChangedEnabled = localStorage.showWindowOnUnreadChanged === 'true';
	}

	if (localStorage['sidebar-closed']) {
		persistedValues.isSideBarEnabled = localStorage['sidebar-closed'] !== 'true';
	}

	if (localStorage.hideTray) {
		persistedValues.isTrayIconEnabled = localStorage.hideTray !== 'true';
	}
};
