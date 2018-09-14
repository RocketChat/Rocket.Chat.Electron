import path from 'path';
import electron from 'electron';
import { Application } from 'spectron';

export let app = null;
let logFetchInterval = null;

export async function startApp () {
    this.timeout(10000);

    app = new Application({
        path: electron,
        cwd: process.cwd(),
        args: [path.join(__dirname, '..')],
        quitTimeout: 5000,
        startTimeout: 5000,
        waitTimeout: 5000,
    });

    await app.start();
    await app.client.waitUntilWindowLoaded();

    logFetchInterval = setInterval(fetchLogs, 100);
};

export async function stopApp () {
    this.timeout(10000);

    if (app && app.isRunning()) {
        clearInterval(logFetchInterval);
        fetchLogs();
        await app.stop();
        app = null;
    }
};

const fetchLogs = async () => {
    const logs = await app.client.getMainProcessLogs();
    logs.forEach(log => console.log(log));
};

export const menuItem = (menuId, cb) => ({
    get exists() {
        return app.client.execute((menuId) => {
            const { Menu } = require('electron').remote;
            const appMenu = Menu.getApplicationMenu();
            const menuItem = appMenu.getMenuItemById(menuId);
            return !!menuItem;
        }, menuId).then(({ value }) => value);
    },

    get enabled() {
        return app.client.execute((menuId) => {
            const { Menu } = require('electron').remote;
            const appMenu = Menu.getApplicationMenu();
            const menuItem = appMenu.getMenuItemById(menuId);
            return menuItem.enabled;
        }, menuId).then(({ value }) => value);
    },

    get visible() {
        return app.client.execute((menuId) => {
            const { Menu } = require('electron').remote;
            const appMenu = Menu.getApplicationMenu();
            const menuItem = appMenu.getMenuItemById(menuId);
            return menuItem.visible;
        }, menuId).then(({ value }) => value);
    },

    get label() {
        return app.client.execute((menuId) => {
            const { Menu } = require('electron').remote;
            const appMenu = Menu.getApplicationMenu();
            const menuItem = appMenu.getMenuItemById(menuId);
            return menuItem.label;
        }, menuId).then(({ value }) => value);
    },

    click() {
        return app.client.execute((menuId) => {
            const { Menu } = require('electron').remote;
            const appMenu = Menu.getApplicationMenu();
            const menuItem = appMenu.getMenuItemById(menuId);
            menuItem.click();
        }, menuId);
    }
});
