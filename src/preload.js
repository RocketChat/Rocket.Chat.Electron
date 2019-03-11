import { ipcRenderer } from 'electron';
import i18n from './i18n';
import setupContextMenuPreload from './preload/contextMenu';
import setupEventsPreload from './preload/events';
import setupJitsiPreload from './preload/jitsi';
import setupLinksPreload from './preload/links';
import setupNotificationsPreload from './preload/notifications';
import setupSidebarPreload from './preload/sidebar';
import setupSpellcheckingPreload from './preload/spellchecking';
import setupTitleChangePreload from './preload/titleChange';
import setupUserPresencePreload from './preload/userPresence';


setupContextMenuPreload();
setupEventsPreload();
setupJitsiPreload();
setupLinksPreload();
setupNotificationsPreload();
setupSidebarPreload();
setupSpellcheckingPreload();
setupTitleChangePreload();
setupUserPresencePreload();

window.reloadServer = () => ipcRenderer.sendToHost('reload-server');
window.i18n = i18n;
