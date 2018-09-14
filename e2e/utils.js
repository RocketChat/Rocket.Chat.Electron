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
