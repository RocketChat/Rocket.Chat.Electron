import { session, dialog, app, ipcMain } from 'electron';
import url from 'url';

async function initialize() {
    session.defaultSession.on('will-download', willDownload);  
}

function willDownload(event, item, webContents) {
    //event.preventDefault();
    console.log(`item ${item}`);
    const downloadFileName = `${app.getPath('downloads')}/${item.getFilename()}`  
}

ipcMain.on('show-save-dialog', (event, arg) => {
    console.log(`event ${arg}`)
    const fileUrl = url.parse(arg);
    const fileName = fileUrl.pathname.substring(fileUrl.pathname.lastIndexOf('/')+1);
    const downloadFileName = `${app.getPath('downloads')}/${decodeURIComponent(fileName)}`  
    dialog.showSaveDialog({title:"Rocket.Chat - Save file", defaultPath: downloadFileName }, (fileName) => {
        event.returnValue = fileName;
    });
});


export default {
    initialize,
};