import { dialog } from 'electron';

import { listen } from '../store';
import { getRootWindow } from '../ui/main/rootWindow';
import { UPLOAD_STARTED, UPLOAD_FINISHED, UPLOAD_FAILED } from './actions';

let activeUploadsCount = 0;

export const setupUploadTracking = (): void => {
  listen(UPLOAD_STARTED, () => {
    activeUploadsCount++;
  });

  listen(UPLOAD_FINISHED, () => {
    activeUploadsCount = Math.max(0, activeUploadsCount - 1);
  });

  listen(UPLOAD_FAILED, () => {
    activeUploadsCount = Math.max(0, activeUploadsCount - 1);
  });
};

export const checkActiveUploads = async (): Promise<boolean> => {
  if (activeUploadsCount === 0) {
    return true;
  }

  const rootWindow = await getRootWindow();
  const choice = dialog.showMessageBoxSync(rootWindow, {
    type: 'warning',
    buttons: ['Cancel', 'Quit'],
    defaultId: 0,
    title: 'Upload in Progress',
    message: 'A file upload is currently in progress. Are you sure you want to quit?',
  });

  return choice === 1;
};
