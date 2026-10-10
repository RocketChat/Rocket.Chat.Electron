import type { SourcesOptions } from 'electron';
import { desktopCapturer } from 'electron';

import { handle } from '../ipc/main';
import { isJitsiServerAllowed } from './main';

let permitted = false;
let dontAskAgain = false;
let firstAskPermission = true;

// The Jitsi bridge forwards options coming from a web page straight into the
// native desktopCapturer, so they are normalized before reaching it:
// - a zero-sized thumbnailSize is known to crash the PipeWire-backed capture
//   stack natively on Wayland (electron#47591, fixed by electron#47641) —
//   the exact setup of issue #2823 (WebRTCPipeWireCapturer), and jitsi-meet
//   requests `{width: 0, height: 0}` when it does not need thumbnails;
// - huge sizes make the capturer allocate oversized thumbnails for every
//   enumerated window;
// - only screen/window enumeration is meaningful for the Jitsi share picker.
const MAX_THUMBNAIL_DIMENSION = 512;
const MIN_THUMBNAIL_DIMENSION = 1;

const normalizeThumbnailDimension = (value: unknown): number => {
  const dimension = Number(value);

  if (!Number.isFinite(dimension) || dimension < MIN_THUMBNAIL_DIMENSION) {
    return MIN_THUMBNAIL_DIMENSION;
  }

  return Math.min(Math.floor(dimension), MAX_THUMBNAIL_DIMENSION);
};

export const normalizeSourcesOptions = (opts: unknown): SourcesOptions => {
  const options: SourcesOptions =
    opts && typeof opts === 'object' ? (opts as SourcesOptions) : ({} as SourcesOptions);

  const types = Array.isArray(options.types)
    ? options.types.filter((type) => type === 'screen' || type === 'window')
    : [];

  const normalized: SourcesOptions = {
    types: types.length > 0 ? types : ['screen', 'window'],
  };

  if (
    options.thumbnailSize &&
    typeof options.thumbnailSize === 'object'
  ) {
    normalized.thumbnailSize = {
      width: normalizeThumbnailDimension(options.thumbnailSize.width),
      height: normalizeThumbnailDimension(options.thumbnailSize.height),
    };
  }

  if (typeof options.fetchWindowIcons === 'boolean') {
    normalized.fetchWindowIcons = options.fetchWindowIcons;
  }

  return normalized;
};

export const handleJitsiDesktopCapturerGetSources = () => {
  handle(
    'jitsi-desktop-capturer-get-sources',
    async (_webContents, [opts, jitsiDomain]) => {
      if (permitted) {
        return desktopCapturer.getSources(normalizeSourcesOptions(opts));
      }

      if (dontAskAgain) return [];

      if (firstAskPermission) {
        firstAskPermission = false;
        const askResult = await isJitsiServerAllowed(jitsiDomain);
        permitted = askResult.allowed;
        dontAskAgain = askResult.dontAskAgain;
      }
      return [];
    }
  );
};
