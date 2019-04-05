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
        var downloadManagerItems = document.querySelector('.app-download-manager-items');
        
        const downloadManagerWindow = document.querySelector('.app-download-manager');
        if(downloadManagerWindow.style.display === 'none') {
            //create elements
            let downloadData = await this.loadDownloads();
            console.log(`download data ${downloadData}`);

            downloadData.forEach((item) => {
                console.log(`entry ${JSON.stringify(item)}`)
                const divElement = document.createElement("div");
                divElement.setAttribute('id', item.createDate);
    
                const titleDiv = document.createElement("div");
                titleDiv.textContent = item.fileName;
                titleDiv.setAttribute('class', 'app-download-manager-item_title');
        
                const buttonsDiv = document.createElement("div");
                titleDiv.setAttribute('class', 'app-download-manager-item_buttons');
        
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
                downloadManagerItems.appendChild(divElement);
                
                downloadManagerWindow.style.display = 'block'

            });
            
        } else {
            //delete elements
            downloadManagerWindow.style.display = 'none'
            downloadManagerItems.innerHTML = '';
        }
        
        
/*
<div>
			<div class="title">
				My Download title
			</div>
			<div class="app-download-manager_buttons">
				<div class="app-download-manager_button_stop"></div>
				<div class="app-download-manager_button_show"></div>
			</div>
        </div>
        */

       
        /*this.addDownload("");
        this.clearDownloads();
        this.loadDownloads();*/
        /*result.onsuccess = (e) => {
            console.log(`load all data: ${JSON.stringify(e.target.result)}`);

        }*/

        
    }

    async loadDownloads() {
        return new Promise((resolve, reject) => {
            var store = this.getDownloadManagerStore('readonly');
            var result = store.getAll();
            result.onsuccess = (e) => {
                //console.log(`event ${JSON.stringify(e)}  - result ${JSON.stringify(result.result)}`);
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
        console.log(`clearAllDbItems`);
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
            console.log(`download is still running ${runningDownloads}`)
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