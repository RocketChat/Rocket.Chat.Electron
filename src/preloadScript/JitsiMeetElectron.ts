import { desktopCapturer, DesktopCapturerSource, NativeImage } from 'electron';

import type { JitsiMeetElectronAPI } from '../common/types/JitsiMeetElectronAPI';

export const JitsiMeetElectron: JitsiMeetElectronAPI = {
  async obtainDesktopStreams(callback, errorCallback, options) {
    try {
      const sources = (
        await desktopCapturer.getSources(options)
      ).map<DesktopCapturerSource>((source) => ({
        id: source.id,
        name: source.name,
        display_id: source.display_id,
        thumbnail: {
          toDataURL: () => source.thumbnail.toDataURL(),
        } as NativeImage,
        appIcon: {
          toDataURL: () => source.appIcon.toDataURL(),
        } as NativeImage,
      }));

      callback(sources);
    } catch (error) {
      errorCallback(error);
    }
  },
};
