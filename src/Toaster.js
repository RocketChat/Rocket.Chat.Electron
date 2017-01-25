import { BrowserWindow, ipcMain, screen } from 'electron';

export default class Toaster {
    constructor (mainWindow, maxNotifications = 3, debug = false) {
        this.mainWindow = mainWindow;
        this.debug = debug;
        this.maxNotifications = maxNotifications;
        this.windows = [];
    }

    toast (msg, callback) {
        const window = new BrowserWindow({
            width: msg.width,
            height: 75,
            transparent: true,
            frame: false,
            show : false,
            alwaysOnTop: true,
            skipTaskbar: true,
            resizable: false,
            focusable: false
        });

        if (this.debug) {
            window.openDevTools();
        }

        this.windows.push(window);

        ipcMain.once(`notification-${msg.tag}`, callback);

        window.on('closed', () => {
            this.windows = this.windows.filter((win) => win && !win.isDestroyed() && win !== window);
            this.windows.forEach((win, i) => this._setPosition(win, i + 1));
        });

        const htmlFile = `${msg.htmlFile}?` +
            `title=${encodeURIComponent(msg.title || '')}&` +
            `message=${encodeURIComponent(msg.message || '')}&` +
            `timeout=${msg.timeout}&` +
            `icon=${encodeURIComponent(msg.icon)}&` +
            `tag=${encodeURIComponent(msg.tag)}`;

        window.loadURL(htmlFile);

        window.webContents.on('did-finish-load', () => {
            this._setPosition(window, this.windows.length);
        });
    }

    _setPosition (window, index) {
        const [ notificationWidth, notificationHeight ] = window.getSize();
        const [ appX, appY ] = this.mainWindow.getPosition();
        const { x, y, width, height } = screen.getDisplayNearestPoint({x: appX, y: appY}).workArea;
        const margin = 5;
        const notificationX = x + width - notificationWidth - margin;
        const notificationDistance = notificationHeight + margin;
        const notificationY = y + height - (notificationDistance * index);

        window.setPosition(notificationX, notificationY);

        if (index <= this.maxNotifications) {
            window.showInactive();
        }
    }
}
