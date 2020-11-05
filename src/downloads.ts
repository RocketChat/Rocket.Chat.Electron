import { BrowserWindow, ipcMain } from 'electron';
import Store from 'electron-store';
import sharp from 'sharp';


export const setupDownloads = (rootWindow: BrowserWindow): void => {
  const store = new Store();

  // Load all downloads from LocalStorage into Main Process and send to Download Manager.
  ipcMain.on('load-downloads', async () => {
    const downloads = await store.get('downloads', {});
    rootWindow.webContents.send('initialize-downloads', downloads);
  });

  ipcMain.on('reset', async () => {
    store.clear();
    const downloads = await store.get('downloads', {});
    rootWindow.webContents.send('initialize-downloads', downloads);
  });

  ipcMain.on('remove', async (_event, itemdId) => {
    store.delete(`downloads.${ itemdId }`);
  });

  // Listen and save a single download being completed.
  ipcMain.on('download-complete', async (_event, downloadItem) => {
    const downloads = await store.get('downloads', {});
    downloads[downloadItem.itemId] = downloadItem;
    store.set('downloads', downloads);
  });

  // Downloads handler. Handles all downloads from links.
  rootWindow.webContents.session.on('will-download', async (_event, item, webContents) => {
    const mime = item.getMimeType();
    const itemId = Date.now();
    const url = item.getURLChain()[0];
    const serverTitle = url.split('#')[1];
    const startTime = new Date().getTime();
    const totalBytes = item.getTotalBytes();
    let paused = false;
    let endTime;
    let isCancelledByDialog = true;

    rootWindow.webContents.send('create-download-item', { status: 'All', serverTitle, itemId, totalBytes: item.getTotalBytes(), fileName: item.getFilename(), url, serverId: webContents.id, mime }); // Request download item creation in UI and send unqiue ID.

    // Cancelled Download
    ipcMain.on(`cancel-${ itemId }`, () => {
      isCancelledByDialog = false;
      item.cancel();
    });

    // Paused Download
    ipcMain.on(`pause-${ itemId }`, () => {
      if (paused) {
        item.resume();
      } else {
        item.pause();
      }
      paused = !paused;
    });
    item.on('updated', (_event, state) => {
      if (state === 'interrupted') {
        console.log('Download is interrupted but can be resumed');
      } else if (state === 'progressing') {
        if (item.isPaused()) {
          console.log('Download is paused');
        } else {
          endTime = new Date().getTime();
          const duration = (endTime - startTime) / 1000;
          const Bps = item.getReceivedBytes() / duration;
          const Kbps = Bps / 1024;
          const Mbps = Kbps / 1024;
          const recievedBytes = item.getReceivedBytes();
          const timeLeft = Bps ? Math.round((totalBytes - recievedBytes) / Bps) : null;
          const path = item.getSavePath();
          const pathsArray = path.split('/');
          const fileName = pathsArray[pathsArray.length - 1];

          // Sending Download Information. TODO: Seperate bytes as information sent is being repeated.
          rootWindow.webContents.send(`downloading-${ itemId }`, {
            bytes: item.getReceivedBytes(),
            Mbps: Mbps.toFixed(2),
            Kbps: Kbps.toFixed(2),
            timeLeft,
            fileName,
          });
        }
      }
    });
    item.once('done', async (_event, state) => {
      if (state === 'completed') {
        const path = item.getSavePath();
        const pathsArray = path.split('/');
        const fileName = pathsArray[pathsArray.length - 1];
        const thumbnail = mime.split('/')[0] === 'image' ? await sharp(path).resize(100, 100).png().toBuffer() : null;
        rootWindow.webContents.send(`download-complete-${ itemId }`, { percentage: 100, path, fileName, thumbnail: thumbnail && `data:image/png;base64,${ thumbnail.toString('base64') }` }); // Send to specific DownloadItem
      } else if (isCancelledByDialog) {
        rootWindow.webContents.send('download-cancelled', itemId); // Remove Item from UI if interrupted or cancelled
      }
    });
  });
};
