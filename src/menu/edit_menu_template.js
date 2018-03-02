import i18n from '../i18n/index.js';

export const editMenuTemplate = {
    label: i18n.__('Edit'),
    submenu: [
        { label: i18n.__('Undo'), accelerator: "CmdOrCtrl+Z", selector: "undo:" },
        { label: i18n.__('Redo'), accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
        { type: "separator" },
        { label: i18n.__('Cut'), accelerator: "CmdOrCtrl+X", selector: "cut:" },
        { label: i18n.__('Copy'), accelerator: "CmdOrCtrl+C", selector: "copy:" },
        { label: i18n.__('Paste'), accelerator: "CmdOrCtrl+V", selector: "paste:" },
        { label: i18n.__('Select_All'), accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
    ]
};
