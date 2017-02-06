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

var supportExternalLinks = function (e) {
    var href;
    var isExternal = false;

    var checkDomElement = function (element) {
        if (element.nodeName === 'A') {
            if (element.classList.contains('swipebox') === false) {
                href = element.getAttribute('href') || '';
            }
        }

        if (/^https?:\/\/.+/.test(href) === true /*&& RegExp('^https?:\/\/'+location.host).test(href) === false*/) {
            isExternal = true;
        }

        if (href && isExternal) {
            shell.openExternal(href);
            e.preventDefault();
        } else if (element.parentElement) {
            checkDomElement(element.parentElement);
        }
    };

    checkDomElement(e.target);
};

document.addEventListener('click', supportExternalLinks, false);

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
