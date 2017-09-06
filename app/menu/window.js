import { remote } from 'electron';
import { dispatch, getState } from '../store/mainStore';
import { setActive } from '../actions/server';
import i18n from '../i18n';
const isMac = process.platform === 'darwin';

function build() {
  const servers = getState().servers;
  const macWindowTemplate = [
    {
      label: i18n.__('Minimize'),
      accelerator: 'Command+M',
      role: 'minimize'
    },
    {
      label: i18n.__('Close'),
      accelerator: 'Command+W',
      role: 'close'
    },
    {
      type: 'separator'
    },
    {
      type: 'separator',
      id: 'server-list-separator',
      visible: !!servers.length
    },
    {
      label: i18n.__('Add_new_server'),
      accelerator: 'Command+N',
      click: () => dispatch(setActive(null))
    },
    {
      type: 'separator'
    },
    {
      label: i18n.__('Bring_All_to_Front'),
      click: () => {
        const mainWindow = remote.getCurrentWindow();
        mainWindow.show();
      }
    }
  ];

  const windowTemplate = [
    {
      type: 'separator',
      id: 'server-list-separator',
      visible: false
    },
    {
      label: i18n.__('Add_new_server'),
      accelerator: 'Ctrl+N',
      click: () => dispatch(setActive(null))
    },
    {
      type: 'separator'
    },
    {
      label: i18n.__('Close'),
      accelerator: 'Ctrl+W',
      click: () => {
        remote.getCurrentWindow().close();
      }
    }
  ];

  const template = isMac ? macWindowTemplate : windowTemplate;


  servers.forEach((server, position) => template.push({
    label: server.title,
    accelerator: `CmdOrCtrl+ ${position + 1}`,
    position: 'before=server-list-separator',
    id: server.url,
    click: () => dispatch(setActive(server.url))
  }));
  return template;
}

export default build;
