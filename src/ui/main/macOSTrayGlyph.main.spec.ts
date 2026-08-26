import {
  applyMacOSMenuBarGlyphAppearance,
  invertDarkAchromaticPixels,
} from './macOSTrayGlyph';

const addRepresentation = jest.fn();
const createEmpty = jest.fn(() => ({ addRepresentation }));

jest.mock('electron', () => ({
  nativeImage: {
    createEmpty: () => createEmpty(),
  },
}));

const pixel = (b: number, g: number, r: number, a: number): Buffer =>
  Buffer.from([b, g, r, a]);

describe('invertDarkAchromaticPixels', () => {
  it('inverts opaque black (the rocket glyph) to white', () => {
    expect([...invertDarkAchromaticPixels(pixel(0, 0, 0, 255))]).toEqual([
      255, 255, 255, 255,
    ]);
  });

  it('inverts anti-aliased black edges and keeps coverage alpha', () => {
    expect([...invertDarkAchromaticPixels(pixel(0, 0, 0, 115))]).toEqual([
      255, 255, 255, 115,
    ]);
  });

  it('does not invert the online presence green', () => {
    const online = pixel(165, 224, 45, 255);
    expect([...invertDarkAchromaticPixels(online)]).toEqual([...online]);
  });

  it('does not invert busy red or away yellow', () => {
    const busy = pixel(92, 69, 245, 255);
    const away = pixel(31, 210, 255, 255);
    expect([...invertDarkAchromaticPixels(busy)]).toEqual([...busy]);
    expect([...invertDarkAchromaticPixels(away)]).toEqual([...away]);
  });

  it('does not invert the offline mid-grey dot', () => {
    const offline = pixel(168, 162, 158, 255);
    expect([...invertDarkAchromaticPixels(offline)]).toEqual([...offline]);
  });

  it('does not invert the disconnected-badge amber fill', () => {
    const amber = pixel(57, 140, 243, 255);
    expect([...invertDarkAchromaticPixels(amber)]).toEqual([...amber]);
  });

  it('leaves fully transparent pixels alone', () => {
    expect([...invertDarkAchromaticPixels(pixel(0, 0, 0, 0))]).toEqual([
      0, 0, 0, 0,
    ]);
  });

  it('does not mutate the input buffer', () => {
    const input = pixel(0, 0, 0, 255);
    invertDarkAchromaticPixels(input);
    expect([...input]).toEqual([0, 0, 0, 255]);
  });
});

describe('applyMacOSMenuBarGlyphAppearance', () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    addRepresentation.mockClear();
    createEmpty.mockClear();
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
  });

  it('inverts the glyph even when the OS appearance setting is light', () => {
    const black = Buffer.from([0, 0, 0, 255]);
    const image = {
      isEmpty: () => false,
      getSize: () => ({ width: 1, height: 1 }),
      getScaleFactors: () => [1],
      toBitmap: () => black,
    };

    applyMacOSMenuBarGlyphAppearance(image as never);

    expect(addRepresentation).toHaveBeenCalledTimes(1);
    expect([...addRepresentation.mock.calls[0][0].buffer]).toEqual([
      255, 255, 255, 255,
    ]);
  });
});
