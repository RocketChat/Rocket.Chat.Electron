/** @jest-environment jsdom */
import { installMediaCaptureHook } from '../mediaCapture';

type FakeTrack = {
  kind: 'audio' | 'video';
  readyState: 'live' | 'ended';
  addEventListener: jest.Mock;
  stop: () => void;
  _endedHandlers: Array<() => void>;
};

// Constructed via `new (window as any).MediaStreamTrack()` so `track.stop()`
// resolves through the (possibly hook-patched) prototype method, matching how
// a real MediaStreamTrack instance behaves.
const createFakeTrack = (kind: 'audio' | 'video'): FakeTrack => {
  const track = new (window as any).MediaStreamTrack() as FakeTrack;
  track.kind = kind;
  track.readyState = 'live';
  track._endedHandlers = [];
  track.addEventListener = jest.fn((event: string, handler: () => void) => {
    if (event === 'ended') {
      track._endedHandlers.push(handler);
    }
  });

  return track;
};

const createFakeStream = (tracks: FakeTrack[]) => ({
  getTracks: () => tracks,
});

describe('servers/preload/mediaCapture hook script', () => {
  let reportMediaCapture: jest.Mock;
  let getUserMediaMock: jest.Mock;
  let getDisplayMediaMock: jest.Mock;

  const installHook = (): void => {
    installMediaCaptureHook();
  };

  beforeEach(() => {
    reportMediaCapture = jest.fn();
    getUserMediaMock = jest.fn();
    getDisplayMediaMock = jest.fn();

    delete (window as any).__rcDesktopMediaCaptureHooked;
    (window as any).RocketChatDesktop = { reportMediaCapture };

    Object.defineProperty(window.navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: getUserMediaMock,
        getDisplayMedia: getDisplayMediaMock,
      },
    });

    (window as any).MediaStreamTrack = function MediaStreamTrack(
      this: FakeTrack
    ) {
      this.readyState = 'live';
    };
    (window as any).MediaStreamTrack.prototype.stop = function stop(
      this: FakeTrack
    ) {
      this.readyState = 'ended';
    };

    installHook();
  });

  it('reports camera true after getUserMedia resolves a video track', async () => {
    const videoTrack = createFakeTrack('video');
    getUserMediaMock.mockResolvedValue(createFakeStream([videoTrack]));

    await window.navigator.mediaDevices.getUserMedia({ video: true } as any);

    expect(reportMediaCapture).toHaveBeenCalledTimes(1);
    expect(reportMediaCapture).toHaveBeenCalledWith({
      camera: true,
      microphone: false,
      screen: false,
    });
  });

  it('reports microphone true after getUserMedia resolves an audio track', async () => {
    const audioTrack = createFakeTrack('audio');
    getUserMediaMock.mockResolvedValue(createFakeStream([audioTrack]));

    await window.navigator.mediaDevices.getUserMedia({ audio: true } as any);

    expect(reportMediaCapture).toHaveBeenCalledWith({
      camera: false,
      microphone: true,
      screen: false,
    });
  });

  it('reports screen true after getDisplayMedia resolves', async () => {
    const screenTrack = createFakeTrack('video');
    getDisplayMediaMock.mockResolvedValue(createFakeStream([screenTrack]));

    await window.navigator.mediaDevices.getDisplayMedia({} as any);

    expect(reportMediaCapture).toHaveBeenCalledWith({
      camera: false,
      microphone: false,
      screen: true,
    });
  });

  it('reports state false again after the track is stopped via track.stop()', async () => {
    const videoTrack = createFakeTrack('video');
    getUserMediaMock.mockResolvedValue(createFakeStream([videoTrack]));

    await window.navigator.mediaDevices.getUserMedia({ video: true } as any);
    reportMediaCapture.mockClear();

    videoTrack.stop();

    expect(reportMediaCapture).toHaveBeenCalledTimes(1);
    expect(reportMediaCapture).toHaveBeenCalledWith({
      camera: false,
      microphone: false,
      screen: false,
    });
  });

  it('reports state false again after the track fires "ended"', async () => {
    const videoTrack = createFakeTrack('video');
    getUserMediaMock.mockResolvedValue(createFakeStream([videoTrack]));

    await window.navigator.mediaDevices.getUserMedia({ video: true } as any);
    reportMediaCapture.mockClear();

    videoTrack.readyState = 'ended';
    videoTrack._endedHandlers.forEach((handler) => handler());

    expect(reportMediaCapture).toHaveBeenCalledTimes(1);
    expect(reportMediaCapture).toHaveBeenCalledWith({
      camera: false,
      microphone: false,
      screen: false,
    });
  });

  it('does not report duplicate identical state', async () => {
    const videoTrack = createFakeTrack('video');
    const audioTrack = createFakeTrack('audio');
    getUserMediaMock.mockResolvedValue(
      createFakeStream([videoTrack, audioTrack])
    );

    await window.navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    } as any);
    expect(reportMediaCapture).toHaveBeenCalledTimes(1);

    // A second getUserMedia call that adds no new distinct state must not
    // trigger a second report.
    const secondVideoTrack = createFakeTrack('video');
    getUserMediaMock.mockResolvedValue(createFakeStream([secondVideoTrack]));
    await window.navigator.mediaDevices.getUserMedia({ video: true } as any);

    expect(reportMediaCapture).toHaveBeenCalledTimes(1);
  });

  it('also reports through window.videoCallWindow.reportMediaCapture when present', async () => {
    const videoCallReport = jest.fn();
    (window as any).videoCallWindow = { reportMediaCapture: videoCallReport };

    const videoTrack = createFakeTrack('video');
    getUserMediaMock.mockResolvedValue(createFakeStream([videoTrack]));

    await window.navigator.mediaDevices.getUserMedia({ video: true } as any);

    expect(videoCallReport).toHaveBeenCalledWith({
      camera: true,
      microphone: false,
      screen: false,
    });
  });

  it('does not install the hook twice', async () => {
    installHook();

    const videoTrack = createFakeTrack('video');
    getUserMediaMock.mockResolvedValue(createFakeStream([videoTrack]));

    // getUserMedia should still be wrapped exactly once: calling it resolves
    // without throwing and reports exactly once.
    await window.navigator.mediaDevices.getUserMedia({ video: true } as any);

    expect(reportMediaCapture).toHaveBeenCalledTimes(1);
  });
});
