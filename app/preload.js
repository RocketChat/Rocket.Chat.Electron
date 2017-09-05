/* globals Meteor, Tracker, RocketChat, UserPresence, $ */

const { ipcRenderer, shell } = require('electron');
const Notification = require('./lib/Notification');
const SpellCheck = require('./lib/SpellCheck');

window.Notification = Notification;

const events = ['unread-changed', 'get-sourceId'];

events.forEach(e => window.addEventListener(e, event => ipcRenderer.sendToHost(e, event.detail)));

const userPresenceControl = () => {
  const INTERVAL = 10000; // 10s
  setInterval(() => {
    try {
      //TODO
      /*const idleTime = ipcRenderer.sendSync('getSystemIdleTime');
      if (idleTime < INTERVAL) {
        UserPresence.setOnline();
      }*/
    } catch (e) {
      console.error(`Error getting system idle time: ${e}`);
    }
  }, INTERVAL);
};


window.addEventListener('load', () => {
  Meteor.startup(() => Tracker.autorun(() => {
    const siteName = RocketChat.settings.get('Site_Name');
    if (siteName) {
      ipcRenderer.sendToHost('title-changed', siteName);
    }
  }));
  userPresenceControl();
});

window.onload = () => {
  function checkExternalUrl(e) {
    const href = $(this).attr('href');
    // Check href matching current domain
    if (RegExp(`^${location.protocol}//${location.host}`).test(href)) {
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
};

// Prevent redirect to url when dragging in
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => e.preventDefault());

const spellChecker = new SpellCheck();
spellChecker.enable();
