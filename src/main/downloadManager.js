import {
	session,
	dialog,
	app,
	ipcMain
} from 'electron';
import { getMainWindow } from './mainWindow';
import url from 'url';

async function initialize() {
	session.defaultSession.on('will-download', willDownload);
}

function willDownload(event, item, webContents) {
    event.preventDefault();
	const downloadFileName = `${app.getPath('downloads')}/${item.getFilename()}`

	const downloadItem = {
        fileSize: item.getTotalBytes(),
		fileName: item.getFilename(),
		filePath: downloadFileName,
		fileType: item.getMimeType(),
		fileState: item.getState()
    }
    
    /*item.setSavePath(downloadFileName);*/
    console.log(`downloadFileName - ${downloadFileName} downloadItem ${JSON.stringify(downloadItem)}`)
    getMainWindow().then(mainWindow => {
        mainWindow.webContents.send('download-manager-start', downloadItem);
    });

	/*item.on('updated', (event, state) => {
		if (state === 'interrupted') {
			console.log('Download is interrupted but can be resumed')
		} else if (state === 'progressing') {
			if (item.isPaused()) {
				console.log('Download is paused')
			} else {
				console.log(`Received bytes: ${item.getReceivedBytes()}`)
			}
		}
	})
	item.once('done', (event, state) => {
		if (state === 'completed') {
			//send event to dl manager ui
			console.log('Download successfully')
		} else {
			// send event to dl manager ui (error)
			console.log(`Download failed: ${state}`)
		}
	});*/
}

export default {
	initialize,
};
