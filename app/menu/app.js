import { app } from 'electron';
import i18n from '../i18n';
import { createWindow } from '../utils/window';

const APP_NAME = app.getName();
const isMac = process.platform === 'darwin';

const appTemplate = [
  {
    label: i18n.__('About', APP_NAME),
    click: () => {
      const win = createWindow('about', {
        page: 'about',
        width: 310,
        height: 240,
        resizable: false,
        show: false,
        center: true,
        maximizable: false,
        minimizable: false,
        title: 'About Rocket.Chat'
      });
      win.setMenuBarVisibility(false);
      win.openDevTools()
    }
  },
  {
    type: 'separator',
    id: 'about-sep'
  },
  {
    label: i18n.__('Quit_App', APP_NAME),
    accelerator: 'CommandOrControl+Q',
    click: function () {
      app.quit();
    }
  }
];

if (isMac) {
  const macAppExtraTemplate = [
    {
      role: 'services',
      submenu: [],
      position: 'after=about-sep'
    },
    {
      type: 'separator'
    },
    {
      accelerator: 'Command+H',
      role: 'hide'
    },
    {
      accelerator: 'Command+Alt+H',
      role: 'hideothers'
    },
    {
      role: 'unhide'
    },
    {
      type: 'separator'
    }
  ];
  appTemplate.push(...macAppExtraTemplate);
}

export default appTemplate;
