
const editTemplate = [
    {
        label: 'Undo',
        accelerator: 'CommandOrControl+Z',
        role: 'undo'
    },
    {
        label: 'Redo',
        accelerator: 'CommandOrControl+Shift+Z',
        role: 'redo'
    },
    {
        type: 'separator'
    },
    {
        label: 'Cut',
        accelerator: 'CommandOrControl+X',
        role: 'cut'
    },
    {
        label: 'Copy',
        accelerator: 'CommandOrControl+C',
        role: 'copy'
    },
    {
        label: 'Paste',
        accelerator: 'CommandOrControl+V',
        role: 'paste'
    },
    {
        label: 'Select All',
        accelerator: 'CommandOrControl+A',
        role: 'selectall'
    }
];

export default editTemplate;
