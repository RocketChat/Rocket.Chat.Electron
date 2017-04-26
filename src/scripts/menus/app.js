import { remote } from 'electron';

const APP_NAME = remote.app.getName();
const isMac = process.platform === 'darwin';

const appTemplate = [
    {
        label: 'About ' + APP_NAME,
        click: function () {
            const win = new remote.BrowserWindow({
                width: 310,
                height: 240,
                resizable: false,
                show: false,
                center: true,
                maximizable: false,
                minimizable: false,
                title: 'About Rocket.Chat'
            });
            win.loadURL('file://' + __dirname + '/about.html');
            win.setMenuBarVisibility(false);
            win.show();
        }
    },
    {
        type: 'separator',
        id: 'about-sep'
    },
    {
        label: `Quit ${APP_NAME}`,
        accelerator: 'CommandOrControl+Q',
        click: function () {
            remote.app.quit();
        }
    }
];

if (isMac) {
    const macAppExtraTemplate = [
        {
            label: 'Hide ' + APP_NAME,
            accelerator: 'Command+H',
            role: 'hide',
            position: 'after=about-sep'
        },
        {
            label: 'Hide Others',
            accelerator: 'Command+Alt+H',
            role: 'hideothers'
        },
        {
            label: 'Show All',
            role: 'unhide'
        },
        {
            type: 'separator'
        }
    ];
    appTemplate.push(...macAppExtraTemplate);
}

export default appTemplate;
