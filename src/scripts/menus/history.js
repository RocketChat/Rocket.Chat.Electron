import webview from '../webview';
const isMac = process.platform === 'darwin';

const macWindowTemplate = [
    {
        label: 'Back',
        accelerator: 'Command+left',
        click: () => { webview.goBack(); }
    },
    {
        label: 'Forward',
        accelerator: 'Command+right',
        click: () => { webview.goForward(); }
    }
];

const windowTemplate = [
    {
        label: 'Back',
        accelerator: 'Alt+Left',
        click: () => { webview.goBack(); }
    },
    {
        label: 'Forward',
        accelerator: 'Alt+Right',
        click: () => { webview.goForward(); }
    },
];

export default isMac ? macWindowTemplate : windowTemplate;
