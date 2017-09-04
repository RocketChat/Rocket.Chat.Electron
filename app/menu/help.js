import { app, shell, dialog } from 'electron';
import jetpack from 'fs-jetpack';
import i18n from '../i18n';

const APP_NAME = app.getName();

const helpTemplate = [
  {
    label: i18n.__('Help_Name', APP_NAME),
    click: () => shell.openExternal('https://rocket.chat/docs')
  },
  {
    type: 'separator'
  },
  {
    label: i18n.__('Report_Issue'),
    click: () => shell.openExternal('https://github.com/RocketChat/Rocket.Chat/issues')
  },
  {
    label: i18n.__('Reset_App_Data'),
    click: () => {
      dialog.showMessageBox({
        type: 'question',
        buttons: ['Yes', 'Cancel'],
        defaultId: 1,
        title: 'Reset App Data',
        message: 'This will sign you out from all your teams and reset the app back to its original settings. This cannot be undone.'
      }, (response) => {
        if (response === 0) {
          const dataDir = app.getPath('userData');
          console.log(dataDir);
          jetpack.remove(dataDir);
          app.relaunch();
          app.quit();
        }
      });
    }
  },
  {
    type: 'separator'
  },
  {
    label: i18n.__('Learn_More'),
    click: () => shell.openExternal('https://rocket.chat')
  }
];

export default helpTemplate;
