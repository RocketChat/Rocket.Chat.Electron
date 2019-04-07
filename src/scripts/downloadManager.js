import { EventEmitter } from 'events';
import { remote, ipcRenderer } from 'electron';
import i18n from '../i18n';
import { clearScreenDown } from 'readline';

class DownloadManager {

    /**
     * create database
     * register all needed html elements
     * register click event
     * register all events
     * 
     */
    constructor() {
        /**
         * initialize database to save download items
         */
        var downloadDb = indexedDB.open("rocket.chat-db",1);
        downloadDb.onupgradeneeded = (event) => {
            var upgradeDb = event.target.result;
            if(!upgradeDb.objectStoreNames.contains('download-manager')) {
                var downloadManager = upgradeDb.createObjectStore('download-manager',{keyPath: 'createDate', autoIncrement:false});
                downloadManager.createIndex("fileState", "fileState", { unique: false });
            }
        };

        downloadDb.onsuccess = (event) => {
            this.db = event.target.result;
        }

        downloadDb.onerror = (error) => {
            ;
        }

        /**
         * set downloadmanager state
         */
        this.downloadManagerWindowIsActive = false;

        /**
         * load all divs 
         */
        this.downloadManagerItems = document.querySelector('.app-download-manager-items');
        this.downloadManagerWindow = document.querySelector('.app-download-manager');
        this.downloadManagerButton = document.querySelector('.sidebar__submenu-action');

        /**
         * downloadManager Button events
         */
        this.downloadManagerClearDownloadsButton = document.querySelector('.app-download-manager-clear-action').addEventListener('click', this.clearAllDbItems.bind(this), false);
        /**
         * event dispatcher 
         */
        ipcRenderer.on('download-manager-start',this.downloadStarted.bind(this));
        ipcRenderer.on('download-manager-error',this.downloadError.bind(this));
        ipcRenderer.on('download-manager-finish',this.downloadFinished.bind(this));
        ipcRenderer.on('download-manager-data-received',this.downloadDataReceived.bind(this));
    }

    
    /**
     * show download manager window with content
     */
    async showWindow(event) {   
        const downloadManagerWindow = document.querySelector('.app-download-manager');
        if(downloadManagerWindow.style.display === 'none') {
            //create elements
            let downloadData = await this.loadDownloads();
            downloadData.forEach((item) => {
                const divElement = document.createElement("div");
                divElement.setAttribute('id', item.createDate);
                divElement.setAttribute('class', 'app-download-manager-item');
    
                const titleDiv = document.createElement("div");
                titleDiv.textContent = item.fileName;
                titleDiv.setAttribute('class', 'app-download-manager-item_title');
        
                const buttonsDiv = document.createElement("div");
                buttonsDiv.setAttribute('class', 'app-download-manager-item_buttons');
        
                const actionDiv = document.createElement("div");
                actionDiv.setAttribute('class', 'app-download-manager-item-button_action');
                actionDiv.textContent = '×';
                //item.fileState;
                
                const showDiv = document.createElement("div");
                showDiv.setAttribute('class', 'app-download-manager-item-button_show');
                
                const showDivIcon = document.createElement("div");
                showDivIcon.setAttribute('class','app-download-manager-item-button_show_icon')
                showDivIcon.textContent = '⚲';
                //item.filePath;
        
                showDiv.appendChild(showDivIcon);

                buttonsDiv.appendChild(actionDiv);
                buttonsDiv.appendChild(showDiv);
        
                divElement.appendChild(titleDiv);
                divElement.appendChild(buttonsDiv);
                this.downloadManagerItems.appendChild(divElement);
                
                downloadManagerWindow.style.display = 'block'
                this.downloadManagerWindowIsActive = true;

            });
        } else {
            //delete elements
            downloadManagerWindow.style.display = 'none'
            this.downloadManagerItems.innerHTML = '';
            this.downloadManagerWindowIsActive = false;
        }
    }

    async loadDownloads() {
        return new Promise((resolve, reject) => {
            var store = this.getDownloadManagerStore('readonly');
            var result = store.getAll();
            result.onsuccess = (e) => {
                resolve(result.result, null);
            }
            result.onerror = (e) => {
                reject(null,e);
            }
        });
    }

    /**
     * save item in database
     */
    saveDbItem(item) {
        var store = this.getDownloadManagerStore('readwrite');
        var request = store.add(item);
        request.onerror = (e) => {
          ;
        };

        request.onsuccess = (e) => {
          ;
        };
    }

    /**
     * update object in database
     */
    updateDbItem(item) {
        var store = this.getDownloadManagerStore('readwrite');
        return store.put(item);
    }
    
    /**
     * clear all not running downloads from databse
     */
    clearAllDbItems() {
        var store = this.getDownloadManagerStore('readwrite');
        var request = store.getAll();
        request.onsuccess = (e) => {
            request.result.forEach(element => {
                if(element.fileState !== 'progressing') {
                    store.delete(element.createDate);
                    const childElement = document.getElementById(element.createDate);
                    this.downloadManagerItems.removeChild(childElement);
                }
            });
        }
    }

    getDownloadManagerStore(mode) {
        var transaction = this.db.transaction(['download-manager'], mode);
        return transaction.objectStore('download-manager');
    }

    /**
     * download of item started, set downloadManagerButton to active
     */
    downloadStarted(event, downloadItem) {
        if(!this.downloadManagerButton.className.includes('active')) {
            this.downloadManagerButton.className = `${this.downloadManagerButton.className} ${this.downloadManagerButton.className}-active`
        }

        //add item direct if downloadmanager is open
        if(this.downloadManagerWindowIsActive) {
            //add render method
        }
        //save item to db
        this.saveDbItem(downloadItem);
    }

    downloadFinished(event, downloadItem) {
        let request = this.updateDbItem(downloadItem);
        request.onsuccess = (e) => {
            this.inactiveDownloadManagerButton(e,this.downloadManagerButton);
        };
        request.onerror = (e) => {
            //set item in list to error?
        };
    }
        
    /**
     * check htmlElement an change class if no download is running 
     */
    async inactiveDownloadManagerButton(event, htmlElement) {
        if(htmlElement.className.includes('active')) {
            //check if any other 
            const runningDownloads = await this.checkRunningDownloads();
            if(!runningDownloads) {
                htmlElement.className = `${htmlElement.className.split(' ')[0]}`
            }
        }
    }

    /**
     * check if any download is still running.
     */
    async checkRunningDownloads() {
        return new Promise((resolve,reject) => {
            let store = this.getDownloadManagerStore('readonly');
            let fileStateIndex = store.index("fileState");
            let request = fileStateIndex.get('progressing');
            request.onerror = (e) => {
                reject(null,e);
              };
      
              request.onsuccess = (e) => {
                  if(e.target.result == undefined) {
                    resolve(false, null);
                  } else {
                      resolve(true, null);
                  }
              };
        }); 
    }
    
    downloadError(event, downloadItem) {
        this.inactiveDownloadManagerButton(event, this.downloadManagerButton);  
    }

    downloadDataReceived(event, downloadItem) {
        //console.log(`download data rec ${JSON.stringify(downloadItem)}`);
        //save in db?
    }


}

export default new DownloadManager();