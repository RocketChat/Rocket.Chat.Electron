import { EventEmitter } from 'events';
import { remote, ipcRenderer } from 'electron';
import i18n from '../i18n';
import { clearScreenDown } from 'readline';

class DownloadManager {

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
         * event dispatcher 
         */
        ipcRenderer.on('download-manager-start',this.downloadStarted.bind(this));
        ipcRenderer.on('download-manager-error',this.downloadError.bind(this));
        ipcRenderer.on('download-manager-finish',this.downloadFinished.bind(this));
    }

    showWindow(event) {    
        var downloadManagerItems = document.querySelector('.app-download-manager-items');
        
        //titleDiv.className = "title";

        const downloadManagerWindow = document.querySelector('.app-download-manager');
        if(downloadManagerWindow.style.display === 'none') {
            //create elements
            
            for(var i = 0 ; i < 10 ; i++) {
                const divElement = document.createElement("div");

            const titleDiv = document.createElement("div");
            titleDiv.textContent = "Item Title";
            titleDiv.setAttribute('class', 'title');
    
            const actionDiv = document.createElement("div");
            titleDiv.setAttribute('class', 'app-download-manager_buttons');
    
            const stopDiv = document.createElement("div");
            stopDiv.setAttribute('class', 'app-download-manager_button_stop');
            stopDiv.textContent = "action item";
            
            const showDiv = document.createElement("div");
            showDiv.setAttribute('class', 'app-download-manager_button_show');
            showDiv.textContent = "Show download item";
    
            actionDiv.appendChild(stopDiv);
            actionDiv.appendChild(showDiv);
    
            divElement.appendChild(titleDiv);
            divElement.appendChild(actionDiv);
                downloadManagerItems.appendChild(divElement);
            }

            downloadManagerWindow.style.display = 'block'
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

       this.loadDownloads();
        /*this.addDownload("");
        this.clearDownloads();
        this.loadDownloads();*/
        /*result.onsuccess = (e) => {
            console.log(`load all data: ${JSON.stringify(e.target.result)}`);

        }*/

        
    }

    loadDownloads() {
        var store = this.getDownloadManagerStore('readonly');
        var result = store.getAll();
        result.onsuccess = (e) => {
            console.log(`event ${JSON.stringify(e)}  - result ${JSON.stringify(result.result)}`);
        }
    }

    saveDbItem(item) {
        var store = this.getDownloadManagerStore('readwrite');
        var request = store.add(item);
        request.onerror = function(e) {
          ;
        };

        request.onsuccess = function(e) {
          ;
        };
    }

    updateDbItem(item) {
        var store = this.getDownloadManagerStore('readwrite');
        return store.put(item);
    }
    
    clearAllDbItems() {
        var store = this.getDownloadManagerStore('readwrite');
        var request = store.getAll();
        request.onsuccess = (e) => {
            request.result.forEach(element => {
                store.delete(element.id);
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
        request.onsuccess = async (e) => {
            if(this.downloadManagerButton.className.includes('active')) {
                //check if any other 
                const runningDownloads = await this.checkRunningDownloads();
                console.log(runningDownloads);
                if(!runningDownloads) {
                    this.downloadManagerButton.className = `${this.downloadManagerButton.className.split(' ')[0]}`
                }
            }
        };

        request.onerror = (e) => {
            //set item in list to error?
        };
    }

    /**
     * check if any download is still running.
     */
    async checkRunningDownloads() {
        return new Promise((resolve,reject) => {
            let store = this.getDownloadManagerStore('readonly');
            let fileStateIndex = store.index("fileState");
            let request = fileStateIndex.get('progress');
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
        console.log(`download error ${downloadItem}`);
    }


}

export default new DownloadManager();