import webview from '../webview';
const isMac = process.platform === 'darwin';

const macWindowTemplate = [
    {
        label: i18n.__('Back'),
        accelerator: 'Command+left',
        click: () => { webview.goBack(); }
    },
    {
        label: i18n.__('Forward'),
        accelerator: 'Command+right',
        click: () => { webview.goForward(); }
    }
];

const windowTemplate = [
    {
        label: i18n.__('Back'),
        accelerator: 'Alt+Left',
        click: () => { webview.goBack(); }
    },
    {
        label: i18n.__('Forward'),
        accelerator: 'Alt+Right',
        click: () => { webview.goForward(); }
    },
];

export default isMac ? macWindowTemplate : windowTemplate;
