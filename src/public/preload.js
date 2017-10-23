/* globals Meteor, Tracker, RocketChat, UserPresence*/
'use strict';

const { ipcRenderer, shell } = require('electron');
const Notification = require('./lib/Notification');
const SpellCheck = require('./lib/SpellCheck');
const i18n = require('../i18n/index');

window.Notification = Notification;
window.i18n = i18n;

const events = ['unread-changed', 'get-sourceId'];

events.forEach(function (e) {
    window.addEventListener(e, function (event) {
        ipcRenderer.sendToHost(e, event.detail);
    });
});

const userPresenceControl = () => {
    const INTERVAL = 10000; // 10s
    setInterval(() => {
        try {
            const idleTime = ipcRenderer.sendSync('getSystemIdleTime');
            if (idleTime < INTERVAL) {
                UserPresence.setOnline();
            }
        } catch (e) {
            console.error(`Error getting system idle time: ${e}`);
        }
    }, INTERVAL);
};

const changeSidebarColor = () => {
    const sidebar = document.querySelector('.sidebar');
    const fullpage = document.querySelector('.full-page');
    if (sidebar) {
        const sidebarItem = sidebar.querySelector('.sidebar-item');
        let itemColor;
        if (sidebarItem) {
            itemColor = window.getComputedStyle(sidebarItem);
        }
        const { color, background } = window.getComputedStyle(sidebar);
        ipcRenderer.sendToHost('sidebar-background', {color: itemColor || color, background: background});
    } else if (fullpage) {
        const { color, background } = window.getComputedStyle(fullpage);
        ipcRenderer.sendToHost('sidebar-background', {color: color, background: background});
    } else {
        window.requestAnimationFrame(changeSidebarColor);

    }
};

ipcRenderer.on('request-sidebar-color', () => {
    changeSidebarColor();
});

window.addEventListener('load', function () {
    Meteor.startup(function () {
        Tracker.autorun(function () {
            const siteName = RocketChat.settings.get('Site_Name');
            if (siteName) {
                ipcRenderer.sendToHost('title-changed', siteName);
            }
        });
    });
    userPresenceControl();
});

window.onload = function () {
    const $ = require('./vendor/jquery-3.1.1');
    function checkExternalUrl (e) {
        const href = $(this).attr('href');
        // Check href matching current domain
        if (RegExp(`^${location.protocol}\/\/${location.host}`).test(href)) {
            return;
        }
        // Check href matching relative URL
        if (!/^([a-z]+:)?\/\//.test(href)) {
            return;
        }

        if (/^file:\/\/.+/.test(href)) {
            const item = href.slice(6);
            shell.showItemInFolder(item);
            e.preventDefault();
        } else {
            shell.openExternal(href);
            e.preventDefault();
        }
    }

    $(document).on('click', 'a', checkExternalUrl);

    $('#reload').click(function () {
        ipcRenderer.sendToHost('reload-server');
        $(this).hide();
        $(this).parent().find('.loading-animation').show();
    });
};

// Prevent redirect to url when dragging in
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => e.preventDefault());

const spellChecker = new SpellCheck();
spellChecker.enable();
