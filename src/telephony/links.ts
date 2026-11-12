import type { TelephonyLink } from './common';
import { normalizePhoneNumber } from './phoneNumber';

const TELEPHONY_PROTOCOLS = ['tel:', 'callto:'];

const getTelephonyTarget = (url: URL): string =>
  url.host ||
  url.pathname ||
  url.href.slice(url.protocol.length).split(/[?#]/)[0];

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
    raw = decodeURIComponent(getTelephonyTarget(url));
  } catch {
    return null;
  }

  // RFC 3966 parameters (";ext=5678", ";phone-context=...") follow the number
  // and stay attached to it, without whitespace.
  const [target, ...parameters] = raw.replace(/^\/+/, '').split(';');
  const number = normalizePhoneNumber(target);

  if (!/\d/.test(number)) {
    return null;
  }

  const phoneNumber = [number, ...parameters]
    .map((part) => part.replace(/\s/g, ''))
    .join(';');

  return { phoneNumber, rawUri: input };
};
