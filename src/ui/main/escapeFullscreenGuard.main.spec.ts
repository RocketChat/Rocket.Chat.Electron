import type { Input, WebContents } from 'electron';

import { createEscapeFullscreenGuard } from './escapeFullscreenGuard';

const originalPlatform = process.platform;

const setPlatform = (platform: NodeJS.Platform): void => {
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true,
  });
};

const createInput = (overrides: Partial<Input> = {}): Input =>
  ({
    type: 'keyDown',
    key: 'Escape',
    code: 'Escape',
    isAutoRepeat: false,
    isComposing: false,
    shift: false,
    control: false,
    alt: false,
    meta: false,
    location: 0,
    modifiers: [],
    ...overrides,
  }) as Input;

describe('createEscapeFullscreenGuard', () => {
  let target: Pick<WebContents, 'sendInputEvent'>;
  let currentTime: number;

  const createGuard = (isWindowFullscreen = true) =>
    createEscapeFullscreenGuard(
      target,
      () => isWindowFullscreen,
      () => currentTime
    );

  beforeEach(() => {
    setPlatform('darwin');
    currentTime = 1_000;
    target = { sendInputEvent: jest.fn() };
  });

  afterEach(() => {
    setPlatform(originalPlatform);
  });

  it('swallows a native Escape key down and replays it as a synthetic event', () => {
    const guard = createGuard();

    expect(guard.handleInput(createInput())).toBe(true);
    expect(target.sendInputEvent).toHaveBeenCalledTimes(1);
    expect(target.sendInputEvent).toHaveBeenCalledWith({
      type: 'keyDown',
      keyCode: 'Escape',
      modifiers: [],
    });
  });

  it('forwards the active modifiers with the replayed event', () => {
    const guard = createGuard();

    guard.handleInput(createInput({ shift: true, control: true }));

    expect(target.sendInputEvent).toHaveBeenCalledWith({
      type: 'keyDown',
      keyCode: 'Escape',
      modifiers: ['shift', 'control'],
    });
  });

  it('swallows auto-repeated Escapes without replaying them', () => {
    const guard = createGuard();

    expect(guard.handleInput(createInput())).toBe(true);
    expect(guard.handleInput(createInput({ isAutoRepeat: true }))).toBe(true);
    expect(guard.handleInput(createInput({ isAutoRepeat: true }))).toBe(true);
    expect(target.sendInputEvent).toHaveBeenCalledTimes(1);

    expect(guard.handleInput(createInput())).toBe(false);
    expect(target.sendInputEvent).toHaveBeenCalledTimes(1);
  });

  it('lets auto-repeated Escapes through when the window is not in fullscreen', () => {
    const guard = createGuard(false);

    expect(guard.handleInput(createInput({ isAutoRepeat: true }))).toBe(false);
    expect(target.sendInputEvent).not.toHaveBeenCalled();
  });

  it('clears the replay credit when the replay lands after fullscreen ended', () => {
    let fullscreen = true;
    const guard = createEscapeFullscreenGuard(
      target,
      () => fullscreen,
      () => currentTime
    );

    expect(guard.handleInput(createInput())).toBe(true);

    fullscreen = false;
    expect(guard.handleInput(createInput())).toBe(false);

    fullscreen = true;
    expect(guard.handleInput(createInput())).toBe(true);
    expect(target.sendInputEvent).toHaveBeenCalledTimes(2);
  });

  it('lets the replayed event through without replaying it again', () => {
    const guard = createGuard();

    expect(guard.handleInput(createInput())).toBe(true);
    expect(guard.handleInput(createInput())).toBe(false);
    expect(target.sendInputEvent).toHaveBeenCalledTimes(1);
  });

  it('guards the next Escape again after the replay window expires', () => {
    const guard = createGuard();

    expect(guard.handleInput(createInput())).toBe(true);

    currentTime += 1_000;

    expect(guard.handleInput(createInput())).toBe(true);
    expect(target.sendInputEvent).toHaveBeenCalledTimes(2);
  });

  it('does nothing when the window is not in fullscreen', () => {
    const guard = createGuard(false);

    expect(guard.handleInput(createInput())).toBe(false);
    expect(target.sendInputEvent).not.toHaveBeenCalled();
  });

  it('ignores key up events', () => {
    const guard = createGuard();

    expect(guard.handleInput(createInput({ type: 'keyUp' }))).toBe(false);
    expect(target.sendInputEvent).not.toHaveBeenCalled();
  });

  it('ignores keys other than Escape', () => {
    const guard = createGuard();

    expect(guard.handleInput(createInput({ key: 'Meta' }))).toBe(false);
    expect(target.sendInputEvent).not.toHaveBeenCalled();
  });

  it.each<NodeJS.Platform>(['win32', 'linux'])('is inert on %s', (platform) => {
    setPlatform(platform);
    const guard = createGuard();

    expect(guard.handleInput(createInput())).toBe(false);
    expect(target.sendInputEvent).not.toHaveBeenCalled();
  });
});
