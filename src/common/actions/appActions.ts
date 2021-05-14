export const APP_ERROR_THROWN = 'app/error-thrown';

export type AppActionTypeToPayloadMap = {
  [APP_ERROR_THROWN]: Error;
};
