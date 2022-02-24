export const JITSI_SERVER_CAPTURE_SCREEN_PERMISSION_UPDATED =
  'jitsi-server-capture-screen-permission-updated';

export type JitsiServerActionTypeToPayloadMap = {
  [JITSI_SERVER_CAPTURE_SCREEN_PERMISSION_UPDATED]: {
    jitsiServer: string;
    allowed: boolean;
  };
};
