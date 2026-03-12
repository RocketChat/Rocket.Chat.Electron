export const UPLOAD_STARTED = 'uploads/started';
export const UPLOAD_FINISHED = 'uploads/finished';
export const UPLOAD_FAILED = 'uploads/failed';

export type UploadsActionTypeToPayloadMap = {
  [UPLOAD_STARTED]: { id: string; fileName: string };
  [UPLOAD_FINISHED]: { id: string };
  [UPLOAD_FAILED]: { id: string };
};
