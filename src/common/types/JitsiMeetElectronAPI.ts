import type { DesktopCapturerSource, SourcesOptions } from 'electron';

export type JitsiMeetElectronAPI = {
  obtainDesktopStreams: (
    callback: (sources: DesktopCapturerSource[]) => void,
    errorCallback: (error: Error) => void,
    options: SourcesOptions
  ) => Promise<void>;
};
