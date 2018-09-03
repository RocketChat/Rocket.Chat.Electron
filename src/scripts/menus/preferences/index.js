import { remote } from 'electron';

class PreferencesPane {

    openPreferences() {
        let win = new remote.BrowserWindow({
            width: 800,
            height: 600,
            center: true,
            maximizable: false,
            title: i18n.__('Preferences'),
        });
        win.loadURL(`file://${__dirname}/preferences.html`);
        win.show();
        win.openDevTools();

        win.on('closed', () => {
            win = null
        });
    }
}

export default new PreferencesPane();