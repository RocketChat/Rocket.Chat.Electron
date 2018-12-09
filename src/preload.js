import { ipcRenderer } from 'electron';
import setupEventsPreload from './preload/events';
import setupJitsiPreload from './preload/jitsi';
import setupLinksPreload from './preload/links';
import setupNotificationsPreload from './preload/notifications';
import setupSidebarPreload from './preload/sidebar';
import SpellCheck from './preload/SpellCheck';


setupEventsPreload(window);
setupJitsiPreload(window);
setupLinksPreload(window);
setupNotificationsPreload(window);
setupSidebarPreload(window);

window.reloadServer = () => ipcRenderer.sendToHost('reload-server');

// Prevent redirect to url when dragging in
window.document.addEventListener('dragover', (e) => e.preventDefault());
window.document.addEventListener('drop', (e) => e.preventDefault());

const spellChecker = new SpellCheck();
spellChecker.enable();
