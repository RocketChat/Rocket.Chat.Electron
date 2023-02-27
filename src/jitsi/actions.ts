export const JITSI_SERVER_CAPTURE_SCREEN_PERMISSION_UPDATED =
  'jitsi-server-capture-screen-permission-updated';
export const JITSI_SERVER_CAPTURE_SCREEN_PERMISSIONS_CLEARED =
  'jitsi-server-capture-screen-permissions-cleared';

export type JitsiServerActionTypeToPayloadMap = {
  [JITSI_SERVER_CAPTURE_SCREEN_PERMISSION_UPDATED]: {
    jitsiServer: string;
    allowed: boolean;
  };
  [JITSI_SERVER_CAPTURE_SCREEN_PERMISSIONS_CLEARED]: void;
};
