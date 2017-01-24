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
            useContentSize: true,
            transparent: true,
            frame: false,
            show : false,
            alwaysOnTop: true,
            skipTaskbar: true,
            resizeable: false
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
            `icon=${msg.icon}&` +
            `tag=${msg.tag}`;

        window.loadURL(htmlFile);

        window.webContents.on('did-finish-load', () => {
            this._setPosition(window, this.windows.length);
        });
    }

    _setPosition (window, index) {
        const width = window.getSize()[0];
        const height = window.getSize()[1];
        const pos = this.mainWindow.getPosition();
        const display = screen.getDisplayNearestPoint({x:pos[0], y:pos[1]});
        const notificationDistance = height + 5;
        const x = display.workAreaSize.width - width - 4;
        const y = display.workAreaSize.height - (notificationDistance * index);

        window.setPosition(x, y);

        if (index <= this.maxNotifications) {
            window.show();
        }
    }
}
