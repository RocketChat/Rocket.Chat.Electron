import { remote } from 'electron';
import { dispatch, getState } from '../store/mainStore';
import i18n from '../i18n';
import certificate from '../background/certificate';
import { toggleSidebar } from '../actions/sidebar';
import { getWindow } from '../utils/window';
import store from '../utils/store';
import { toggleTray } from '../utils/tray';


const isMac = process.platform === 'darwin';
//const certificate = remote.require('./background').certificate;

function build() {
  const viewTemplate = [
    {
      label: i18n.__('Original_Zoom'),
      accelerator: 'CommandOrControl+0',
      role: 'resetzoom'
    },
    {
      label: i18n.__('Zoom_In'),
      accelerator: 'CommandOrControl+Plus',
      role: 'zoomin'
    },
    {
      label: i18n.__('Zoom_Out'),
      accelerator: 'CommandOrControl+-',
      role: 'zoomout'
    },
    {
      type: 'separator'
    },
    {
      label: i18n.__('Current_Server_Reload'),
      accelerator: 'CommandOrControl+R',
      click: () => getWindow('main').webContents.send('reload')
    },
    {
      label: i18n.__('Current_Server_Toggle_DevTools'),
      accelerator: isMac ? 'Command+Alt+I' : 'Ctrl+Shift+I',
      click: () => getWindow('main').webContents.send('toggle-dev-tools')
    },
    {
      type: 'separator'
    },
    {
      label: i18n.__('Application_Reload'),
      accelerator: 'CommandOrControl+Shift+R',
      click: () => getWindow('main').reload()
    },
    {
      label: i18n.__('Application_Toggle_DevTools'),
      click: () => getWindow('main').toggleDevTools()
    },
    {
      type: 'separator',
      id: 'toggle'
    },
    {
      type: 'separator'
    },
    {
      label: i18n.__('Clear'),
      submenu: [
        {
          label: i18n.__('Clear_Trusted_Certificates'),
          click: function () {
            certificate.clear();
          }
        }
      ]
    }
  ];

  if (getState().servers.length > 1) {
    viewTemplate.push({
      label: i18n.__('Toggle_Server_List'),
      click: () => dispatch(toggleSidebar(!getState().sidebarStatus)),
      position: 'after=toggle'
    });
  }
  if (isMac) {
    viewTemplate.push({
      label: i18n.__('Toggle_Tray_Icon'),
      click: () => toggleTray(),
      position: 'after=toggle'
    });
  } else {
    viewTemplate.push({
      label: i18n.__('Toggle_Menu_Bar'),
      click: () => {
        const win = getWindow('main');
        const newStatus = !win.isMenuBarAutoHide();
        win.setAutoHideMenuBar(newStatus);
        store.set('autoHideMenu', newStatus);
      },
      position: 'after=toggle'
    });
  }
  return viewTemplate;
}

export default build;
