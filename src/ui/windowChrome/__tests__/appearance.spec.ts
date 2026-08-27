import type * as appearanceModule from '../appearance';

type Appearance = typeof appearanceModule;

const withPlatform = async (platform: NodeJS.Platform): Promise<Appearance> => {
  const original = process.platform;
  Object.defineProperty(process, 'platform', { value: platform });

  jest.resetModules();
  const appearance = await import('../appearance');

  Object.defineProperty(process, 'platform', { value: original });
  return appearance;
};

describe('getTitleBarOptions', () => {
  it('insets the title bar and places the traffic lights on macOS', async () => {
    const { getTitleBarOptions, TRAFFIC_LIGHTS_X, TRAFFIC_LIGHTS_Y } =
      await withPlatform('darwin');

    expect(getTitleBarOptions()).toEqual({
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: TRAFFIC_LIGHTS_X, y: TRAFFIC_LIGHTS_Y },
    });
  });

  it('hides the title bar on Windows, where the toolbar draws its own controls', async () => {
    const { getTitleBarOptions } = await withPlatform('win32');

    expect(getTitleBarOptions()).toEqual({ titleBarStyle: 'hidden' });
  });

  it('leaves the native frame alone elsewhere', async () => {
    const { getTitleBarOptions } = await withPlatform('linux');

    expect(getTitleBarOptions()).toEqual({});
  });
});

describe('hasInAppTitleBar', () => {
  it.each<[NodeJS.Platform, boolean]>([
    ['darwin', true],
    ['win32', true],
    ['linux', false],
  ])('on %s, is %s', async (platform, expected) => {
    const { hasInAppTitleBar } = await withPlatform(platform);

    expect(hasInAppTitleBar).toBe(expected);
  });
});
