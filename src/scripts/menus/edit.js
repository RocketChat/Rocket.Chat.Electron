import i18n from '../../i18n/index.js';

const editTemplate = [
    {
        label: i18n.__('Undo'),
        accelerator: 'CommandOrControl+Z',
        role: 'undo'
    },
    {
        label: i18n.__('Redo'),
        accelerator: 'CommandOrControl+Shift+Z',
        role: 'redo'
    },
    {
        type: 'separator'
    },
    {
        label: i18n.__('Cut'),
        accelerator: 'CommandOrControl+X',
        role: 'cut'
    },
    {
        label: i18n.__('Copy'),
        accelerator: 'CommandOrControl+C',
        role: 'copy'
    },
    {
        label: i18n.__('Paste'),
        accelerator: 'CommandOrControl+V',
        role: 'paste'
    },
    {
        label: i18n.__('Select_All'),
        accelerator: 'CommandOrControl+A',
        role: 'selectall'
    }
];

export default editTemplate;
