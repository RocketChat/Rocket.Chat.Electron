// The bridge contract version the web client announced. Web clients that
// announce version 1 or later push the server info, URL resolver, title,
// favicon, login state, unread alert preference, git commit hash and Outlook
// credentials themselves, so the legacy injected integrations for those values
// stand down. Older web clients never announce one.
let webClientBridgeVersion = 0;

export const setWebClientBridgeVersion = (version: unknown): void => {
  if (typeof version !== 'number' || !Number.isInteger(version)) return;
  webClientBridgeVersion = version;
};

export const getWebClientBridgeVersion = (): number => webClientBridgeVersion;
