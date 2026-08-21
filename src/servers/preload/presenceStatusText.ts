// `statusText` (the user's custom status message) is absent from the DDP
// publication of the user document, so it has to be read via the REST
// `/api/v1/users.info` endpoint instead. This module holds the pure
// response-parsing logic so it can be unit tested without a live fetch.

type UsersInfoResponse = {
  success?: boolean;
  user?: {
    statusText?: string;
  };
};

// An empty string means "no custom status set" — normalise it to `undefined`
// so callers (and ultimately the tray menu, which already omits the line
// when falsy) treat both cases identically.
export const parseUsersInfoStatusText = (json: unknown): string | undefined => {
  if (!json || typeof json !== 'object') {
    return undefined;
  }

  const response = json as UsersInfoResponse;

  if (response.success !== true) {
    return undefined;
  }

  const statusText = response.user?.statusText;

  if (!statusText) {
    return undefined;
  }

  return statusText;
};
