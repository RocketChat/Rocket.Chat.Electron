/* globals Meteor, Tracker, RocketChat */
'use strict';

const { ipcRenderer, shell } = require('electron');
const Notification = require('./lib/Notification');
const SpellCheck = require('./lib/SpellCheck');

window.Notification = Notification;

var events = ['unread-changed', 'get-sourceId'];

events.forEach(function (e) {
    window.addEventListener(e, function (event) {
        ipcRenderer.sendToHost(e, event.detail);
    });
});

window.addEventListener('load', function () {
    Meteor.startup(function () {
        Tracker.autorun(function () {
            var siteName = RocketChat.settings.get('Site_Name');
            if (siteName) {
                ipcRenderer.sendToHost('title-changed', siteName);
            }
        });
    });
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
            let item = href.slice(6);
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

/**
 * Keep user online if they are still using their computer
 */
const AWAY_TIME = 300000; // 5 mins
const INTERVAL = 10000; // 10 seconds
setInterval(function () {
    try {
        const idleTime = ipcRenderer.sendSync('getSystemIdleTime');
        if (idleTime < AWAY_TIME) {
            Meteor.call('UserPresence:online');
        }
    } catch (e) {
        console.error(`Error getting system idle time: ${e}`);
    }
}, INTERVAL);
