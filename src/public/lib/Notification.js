const { ipcRenderer } = require('electron');

class Notification extends window.Notification {

    constructor (title, options) {
        super(title, options);
        ipcRenderer.send('notification-shim', title, options);

        // Handle correct notification using unique tag
        ipcRenderer.once(`clicked-${options.tag}`, () => this.onclick());
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
