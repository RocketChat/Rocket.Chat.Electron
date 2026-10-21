// The bridge contract version the web client announced. Web clients that
// announce version 1 or later push the server info, URL resolver, title,
// favicon, login state, unread alert preference, git commit hash and Outlook
// credentials themselves, so the legacy injected integrations for those values
// stand down. Older web clients never announce one.
let webClientBridgeVersion = 0;

// The page is untrusted input, so only a non-negative integer counts. The
// version never goes down within a page load: once the injected integrations
// stand down, their reactive computations stop, and a lower version could not
// bring all of them back.
export const setWebClientBridgeVersion = (version: unknown): void => {
  if (
    typeof version !== 'number' ||
    !Number.isSafeInteger(version) ||
    version <= webClientBridgeVersion
  ) {
    return;
  }
  webClientBridgeVersion = version;
};

export const getWebClientBridgeVersion = (): number => webClientBridgeVersion;
