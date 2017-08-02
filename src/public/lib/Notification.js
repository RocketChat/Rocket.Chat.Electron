const { ipcRenderer } = require('electron');

class Notification extends window.Notification {

    constructor (title, options) {
        super(title, options);
    }

    get onclick () {
        return super.onclick;
    }

    set onclick (fn) {
        var result = super.onclick = () => {
            ipcRenderer.send('focus');
            ipcRenderer.sendToHost('focus');
            fn.apply(this, arguments);
        };
        return result;
    }
}

module.exports = Notification;
