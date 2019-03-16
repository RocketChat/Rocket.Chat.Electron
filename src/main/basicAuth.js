import { app, ipcMain } from 'electron';


let servers = {};

function updateServers(newServers = {}) {
	servers = newServers || {};
}

ipcMain.on('update-servers', (event, ...args) => updateServers(...args));

app.on('login', (event, webContents, request, authInfo, callback) => {
	for (const url of Object.keys(servers)) {
		const server = servers[url];
		if (request.url.indexOf(url) === 0 && server.username) {
			callback(server.username, server.password);
			break;
		}
	}
});
