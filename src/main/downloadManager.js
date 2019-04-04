import { session, dialog, app, ipcMain } from 'electron';
import { getMainWindow } from './mainWindow';

async function initialize() {
	session.defaultSession.on('will-download', await willDownload);
}

async function willDownload(event, item, webContents) {
    const downloadFileName = `${app.getPath('downloads')}/${item.getFilename()}`
    
	const downloadItem = {
        fileSize: item.getTotalBytes(),
        fileReceivedBytes: item.getReceivedBytes(),
		    fileName: item.getFilename(),
		    filePath: downloadFileName,
		    fileType: item.getMimeType(),
        fileState: item.getState(),
        createDate: new Date().getTime()
    }
    
    const mainWindow = await getMainWindow();
    
    item.setSavePath(downloadFileName);
    mainWindow.webContents.send('download-manager-start', downloadItem);
    
	item.on('updated', (event, state) => {
        if (state === 'interrupted') {
          console.log('Download is interrupted but can be resumed')
        } else if (state === 'progressing') {
          if (item.isPaused()) {
            console.log('Download is paused')
          } else {
            downloadItem.fileReceivedBytes = item.getReceivedBytes();
            mainWindow.webContents.send('download-manager-data-received',downloadItem);
          }
        }
      })
      item.once('done', (event, state) => {
        if (state === 'completed') {
            downloadItem.fileState = item.getState();
            mainWindow.webContents.send('download-manager-finish', downloadItem);
        } else {
            downloadItem.fileState = item.getState();
            mainWindow.webContents.send('download-manager-error', downloadItem);
        }
      })
}

export default {
	initialize,
};
