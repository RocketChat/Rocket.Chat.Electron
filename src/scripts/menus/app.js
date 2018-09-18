import { remote, ipcRenderer } from 'electron';
import i18n from '../../i18n/index.js';

const appName = remote.app.getName();
const isMac = process.platform === 'darwin';

const appTemplate = [
	{
		label: i18n.__('About', appName),
		click: () => ipcRenderer.send('show-about-dialog'),
	},
	{
		type: 'separator',
		id: 'about-sep',
	},
	{
		label: i18n.__('Quit_App', appName),
		accelerator: 'CommandOrControl+Q',
		click: () => remote.app.quit(),
	},
];

if (isMac) {
	const macAppExtraTemplate = [
		{
			role: 'services',
			submenu: [],
			position: 'after=about-sep',
		},
		{
			type: 'separator',
		},
		{
			accelerator: 'Command+H',
			role: 'hide',
		},
		{
			accelerator: 'Command+Alt+H',
			role: 'hideothers',
		},
		{
			role: 'unhide',
		},
		{
			type: 'separator',
		},
	];
	appTemplate.push(...macAppExtraTemplate);
}

export default appTemplate;
