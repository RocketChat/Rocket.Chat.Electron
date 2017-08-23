import { EventEmitter } from 'events';
import { remote } from 'electron';
import servers from './servers';
import webview from './webview';
import * as menus from './menus';

class SideBar extends EventEmitter {
    constructor () {
        super();

        this.hostCount = 0;

        this.listElement = document.getElementById('serverList');

        servers.forEach((host) => {
            this.add(host);
        });

        servers.on('host-added', (hostUrl) => {
            this.add(servers.get(hostUrl));
        });

        servers.on('host-removed', (hostUrl) => {
            this.remove(hostUrl);
        });

        servers.on('active-setted', (hostUrl) => {
            this.setActive(hostUrl);
        });

        servers.on('active-cleared', (hostUrl) => {
            this.deactiveAll(hostUrl);
        });

        servers.on('title-setted', (hostUrl, title) => {
            this.setLabel(hostUrl, title);
        });

        webview.on('dom-ready', (hostUrl) => {
            this.setImage(hostUrl);
            if (this.isHidden()) {
                this.hide();
            } else {
                this.show();
            }
        });

    }

    add (host) {
        let name = host.title.replace(/^https?:\/\/(?:www\.)?([^\/]+)(.*)/, '$1');
        name = name.split('.');
        name = name[0][0] + (name[1] ? name[1][0] : '');
        name = name.toUpperCase();

        const initials = document.createElement('span');
        initials.innerHTML = name;

        const tooltip = document.createElement('div');
        tooltip.classList.add('tooltip');
        tooltip.innerHTML = host.title;

        const badge = document.createElement('div');
        badge.classList.add('badge');

        const img = document.createElement('img');
        img.onload = function () {
            img.style.display = 'initial';
            initials.style.display = 'none';
        };
        // img.src = `${host.url}/assets/favicon.svg?v=${Math.round(Math.random()*10000)}`;

        const hotkey = document.createElement('div');
        hotkey.classList.add('name');
        if (process.platform === 'darwin') {
            hotkey.innerHTML = '⌘' + (++this.hostCount);
        } else {
            hotkey.innerHTML = '^+' + (++this.hostCount);
        }

        const item = document.createElement('li');
        item.appendChild(initials);
        item.appendChild(tooltip);
        item.appendChild(badge);
        item.appendChild(img);
        item.appendChild(hotkey);

        item.dataset.host = host.url;
        item.setAttribute('server', host.url);
        item.classList.add('instance');

        item.onclick = () => {
            servers.setActive(host.url);
        };

        this.listElement.appendChild(item);

        menus.addServer(host, this.hostCount);
    }

    setImage (hostUrl) {
        const img = this.getByUrl(hostUrl).querySelector('img');
        img.src = `${hostUrl}/assets/favicon.svg?v=${Math.round(Math.random()*10000)}`;
    }

    remove (hostUrl) {
        const el = this.getByUrl(hostUrl);
        if (el) {
            el.remove();
            menus.removeServer(hostUrl);
        }
    }

    getByUrl (hostUrl) {
        return this.listElement.querySelector(`.instance[server="${hostUrl}"]`);
    }

    getActive () {
        return this.listElement.querySelector('.instance.active');
    }

    isActive (hostUrl) {
        return !!this.listElement.querySelector(`.instance.active[server="${hostUrl}"]`);
    }

    setActive (hostUrl) {
        if (this.isActive(hostUrl)) {
            return;
        }

        this.deactiveAll();
        const item = this.getByUrl(hostUrl);
        if (item) {
            item.classList.add('active');
        }
    }

    deactiveAll () {
        let item;
        while (!(item = this.getActive()) === false) {
            item.classList.remove('active');
        }
    }

    setLabel (hostUrl, label) {
        this.listElement.querySelector(`.instance[server="${hostUrl}"] .tooltip`).innerHTML = label;
    }

    setBadge (hostUrl, badge) {
        const item = this.getByUrl(hostUrl);
        const badgeEl = item.querySelector('.badge');

        if (badge !== null && badge !== undefined && badge !== '') {
            item.classList.add('unread');
            if (isNaN(parseInt(badge))) {
                badgeEl.innerHTML = '';
            } else {
                badgeEl.innerHTML = badge;
            }
        } else {
            badge = undefined;
            item.classList.remove('unread');
            badgeEl.innerHTML = '';
        }
        this.emit('badge-setted', hostUrl, badge);
    }

    getGlobalBadge () {
        let count = 0;
        let alert = '';
        const instanceEls = this.listElement.querySelectorAll('li.instance');
        for (let i = instanceEls.length - 1; i >= 0; i--) {
            const instanceEl = instanceEls[i];
            const text = instanceEl.querySelector('.badge').innerHTML;
            if (!isNaN(parseInt(text))) {
                count += parseInt(text);
            }

            if (alert === '' && instanceEl.classList.contains('unread') === true) {
                alert = '•';
            }
        }

        if (count > 0) {
            return String(count);
        } else {
            return alert;
        }
    }

    hide () {
        document.body.classList.add('hide-server-list');
        localStorage.setItem('sidebar-closed', 'true');
        this.emit('hide');
        if (process.platform === 'darwin') {
            document.querySelectorAll('webview').forEach(
                (webviewObj) => { if (webviewObj.insertCSS) { webviewObj.insertCSS('aside.side-nav{margin-top:15px;overflow:hidden; transition: margin .5s ease-in-out; }'); } });
        }
    }

    show () {
        document.body.classList.remove('hide-server-list');
        localStorage.setItem('sidebar-closed', 'false');
        this.emit('show');
        if (process.platform === 'darwin') {
            document.querySelectorAll('webview').forEach(
                (webviewObj) => { if (webviewObj.insertCSS) { webviewObj.insertCSS('aside.side-nav{margin-top:0; overflow:hidden; transition: margin .5s ease-in-out; }'); } });
        }
    }

    toggle () {
        if (this.isHidden()) {
            this.show();
        } else {
            this.hide();
        }
    }

    isHidden () {
        return localStorage.getItem('sidebar-closed') === 'true';
    }
}

export default new SideBar();


let selectedInstance = null;
const instanceMenu = remote.Menu.buildFromTemplate([{
    label: 'Reload server',
    click: function () {
        webview.getByUrl(selectedInstance.dataset.host).reload();
    }
}, {
    label: 'Remove server',
    click: function () {
        servers.removeHost(selectedInstance.dataset.host);
    }
}, {
    label: 'Open DevTools',
    click: function () {
        webview.getByUrl(selectedInstance.dataset.host).openDevTools();
    }
}]);

window.addEventListener('contextmenu', function (e) {
    if (e.target.classList.contains('instance') || e.target.parentNode.classList.contains('instance')) {
        e.preventDefault();
        if (e.target.classList.contains('instance')) {
            selectedInstance = e.target;
        } else {
            selectedInstance = e.target.parentNode;
        }

        instanceMenu.popup(remote.getCurrentWindow());
    }
}, false);

if (process.platform === 'darwin') {
    window.addEventListener('keydown', function (e) {
        if (e.key === 'Meta') {
            document.getElementsByClassName('server-list')[0].classList.add('command-pressed');
        }
    });

    window.addEventListener('keyup', function (e) {
        if (e.key === 'Meta') {
            document.getElementsByClassName('server-list')[0].classList.remove('command-pressed');
        }
    });
} else {
    window.addEventListener('keydown', function (e) {
        if (e.key === 'ctrlKey') {
            document.getElementsByClassName('server-list')[0].classList.add('command-pressed');
        }
    });

    window.addEventListener('keyup', function (e) {
        if (e.key === 'ctrlKey') {
            document.getElementsByClassName('server-list')[0].classList.remove('command-pressed');
        }
    });
}
