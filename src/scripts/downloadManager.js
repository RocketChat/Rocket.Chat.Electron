import { EventEmitter } from 'events';
import { remote, ipcRenderer } from 'electron';
import i18n from '../i18n';
import { clearScreenDown } from 'readline';

class DownloadManager {

    constructor() {
        var downloadDb = indexedDB.open("rocket.chat-db",1);
        downloadDb.onupgradeneeded = (event) => {
            var upgradeDb = event.target.result;
            if(!upgradeDb.objectStoreNames.contains('download-manager')) {
                var downloadManager = upgradeDb.createObjectStore('download-manager',{keyPath: 'id', autoIncrement:true});
            }
        };

        downloadDb.onsuccess = (event) => {
            this.db = event.target.result;
        }

        downloadDb.onerror = (error) => {
            ;
        }

        ipcRenderer.on('download-manager-start',(e) => {
            console.log('event download-manager-start')
            this.downloadStarted(e.target);
        });
    }

            /*
            data store object 
            {
                fileName: "",
                filePath: "",
                status: "", 
                fileSize: "",
                dlSize: ""
            }
            
        });
    }*/

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

        this.addDownload("");
        
        this.loadDownloads();

        this.clearDownloads();

        this.loadDownloads();
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

    addDownload(element) {
        var store = this.getDownloadManagerStore('readwrite');
        var item = {
          name: 'banana',
          price: '$2.99',
          description: 'It is a purple banana!',
          created: new Date().getTime()
        };
      
       var request = store.add(item);
      
       request.onerror = function(e) {
          ;
        };

        request.onsuccess = function(e) {
          ;
        };
    }
    
    clearDownloads() {
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

    downloadStarted(downloadItem) {
        console.log(`download started ${downloadItem}`);
    }
    


}

export default new DownloadManager();