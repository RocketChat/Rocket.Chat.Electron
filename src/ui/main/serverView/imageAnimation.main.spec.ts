import type { WebContents } from 'electron';
import { BrowserWindow } from 'electron';

import { watch } from '../../../store';
import {
  canViewImageAnimation,
  setupImageAnimationPolicy,
  viewImageAnimation,
} from './imageAnimation';

jest.mock('../../../store', () => ({ watch: jest.fn() }));
jest.mock('i18next', () => ({ t: (key: string) => key }));
jest.mock('electron', () => ({ BrowserWindow: jest.fn() }));

const source = () => ({
  isDestroyed: jest.fn(() => false),
  setImageAnimationPolicy: jest.fn(),
  once: jest.fn(),
  session: {},
  getURL: () => 'https://chat.example/channel/general',
});

beforeEach(() => jest.clearAllMocks());

it('sets the initial policy, follows changes and unsubscribes on destruction', () => {
  const contents = source();
  const unsubscribe = jest.fn();
  let update: (enabled: boolean) => void = () => undefined;
  (watch as jest.Mock).mockImplementation((selector, callback) => {
    expect(selector({ isAnimatedImagesEnabled: false })).toBe(false);
    update = callback;
    callback(false);
    return unsubscribe;
  });
  setupImageAnimationPolicy(contents as unknown as WebContents);
  expect(contents.setImageAnimationPolicy).toHaveBeenLastCalledWith(
    'noAnimation'
  );
  update(true);
  expect(contents.setImageAnimationPolicy).toHaveBeenLastCalledWith('animate');
  contents.isDestroyed.mockReturnValue(true);
  update(false);
  expect(contents.setImageAnimationPolicy).toHaveBeenCalledTimes(2);
  expect(contents.once).toHaveBeenCalledWith('destroyed', unsubscribe);
});

it.each([
  'file:///etc/passwd',
  'javascript:alert(1)',
  'data:text/html,test',
  'blob:https://chat.example/id',
  'invalid',
])('rejects unsafe or unsupported viewer URL %s', (url) => {
  expect(canViewImageAnimation(url)).toBe(false);
  viewImageAnimation(source() as unknown as WebContents, url);
  expect(BrowserWindow).not.toHaveBeenCalled();
});

it('plays an image in the workspace session with scripts and navigation disabled', () => {
  const contents = source();
  const viewer = {
    webContents: { setWindowOpenHandler: jest.fn(), on: jest.fn() },
    loadURL: jest.fn(() => Promise.resolve()),
  };
  (BrowserWindow as unknown as jest.Mock).mockImplementation(() => viewer);
  viewImageAnimation(
    contents as unknown as WebContents,
    'https://chat.example/avatar/user'
  );
  expect(BrowserWindow).toHaveBeenCalledWith(
    expect.objectContaining({
      webPreferences: expect.objectContaining({
        session: contents.session,
        imageAnimationPolicy: 'animate',
        javascript: false,
        nodeIntegration: false,
        sandbox: true,
        contextIsolation: true,
      }),
    })
  );
  expect(viewer.loadURL).toHaveBeenCalledWith(
    'https://chat.example/avatar/user',
    {
      httpReferrer: contents.getURL(),
    }
  );
  expect(viewer.webContents.setWindowOpenHandler.mock.calls[0][0]()).toEqual({
    action: 'deny',
  });
  const handlers = Object.fromEntries(viewer.webContents.on.mock.calls);
  const event = { preventDefault: jest.fn() };
  handlers['will-navigate'](event);
  expect(event.preventDefault).toHaveBeenCalledTimes(1);
  handlers['will-redirect'](event, 'file:///etc/passwd');
  expect(event.preventDefault).toHaveBeenCalledTimes(2);
  handlers['will-redirect'](event, 'https://chat.example/redirected-image');
  expect(event.preventDefault).toHaveBeenCalledTimes(2);
});

it('does not open a viewer after the source workspace is destroyed', () => {
  const contents = source();
  contents.isDestroyed.mockReturnValue(true);
  viewImageAnimation(
    contents as unknown as WebContents,
    'https://chat.example/image.gif'
  );
  expect(BrowserWindow).not.toHaveBeenCalled();
});

it('closes the viewer if loading the image fails', async () => {
  const viewer = {
    webContents: { setWindowOpenHandler: jest.fn(), on: jest.fn() },
    loadURL: jest.fn(() => Promise.reject(new Error('image unavailable'))),
    isDestroyed: jest.fn(() => false),
    close: jest.fn(),
  };
  (BrowserWindow as unknown as jest.Mock).mockImplementation(() => viewer);
  viewImageAnimation(
    source() as unknown as WebContents,
    'https://chat.example/image.gif'
  );
  await Promise.resolve();
  expect(viewer.close).toHaveBeenCalledTimes(1);
});
