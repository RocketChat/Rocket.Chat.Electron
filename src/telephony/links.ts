import type { TelephonyLink } from './common';

const TELEPHONY_PROTOCOLS = ['tel:', 'callto:'];

export const parseTelephonyLink = (input: string): TelephonyLink | null => {
  if (/^--/.test(input)) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(input);
  } catch {
    return null;
  }

  if (!TELEPHONY_PROTOCOLS.includes(url.protocol)) {
    return null;
  }

  let raw: string;
  try {
    raw = decodeURIComponent(
      url.pathname || url.href.slice(url.protocol.length)
    );
  } catch {
    return null;
  }

  const phoneNumber = raw.replace(/^\/+/, '').replace(/[\s\-().]/g, '');

  if (!phoneNumber) {
    return null;
  }

  return { phoneNumber, rawUri: input };
};
