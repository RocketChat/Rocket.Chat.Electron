import { dialog } from 'electron';

import { listen } from '../store';
import { getRootWindow } from '../ui/main/rootWindow';
import { UPLOAD_STARTED, UPLOAD_FINISHED, UPLOAD_FAILED } from './actions';

const activeUploads = new Set<string>();

export const setupUploadTracking = (): void => {
  listen(UPLOAD_STARTED, ({ payload }) => {
    if (payload?.id) {
      activeUploads.add(payload.id);
    }
  });

  listen(UPLOAD_FINISHED, ({ payload }) => {
    if (payload?.id) {
      activeUploads.delete(payload.id);
    }
  });

  listen(UPLOAD_FAILED, ({ payload }) => {
    if (payload?.id) {
      activeUploads.delete(payload.id);
    }
  });
};

export const checkActiveUploads = async (): Promise<boolean> => {
  if (activeUploads.size === 0) {
    return true;
  }

  let rootWindow;
  try {
    rootWindow = await getRootWindow();
  } catch {
    rootWindow = undefined;
  }

  const choice = dialog.showMessageBoxSync(rootWindow, {
    type: 'warning',
    buttons: ['Cancel', 'Quit'],
    defaultId: 0,
    title: 'Upload in Progress',
    message:
      'A file upload is currently in progress. Are you sure you want to quit?',
  });

  return choice === 1;
};
