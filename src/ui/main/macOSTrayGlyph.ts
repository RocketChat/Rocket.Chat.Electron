import { nativeImage, type NativeImage } from 'electron';

const CHANNEL_SATURATION_MAX = 30;
const LUMA_MAX = 80;

const luma = (r: number, g: number, b: number): number =>
  (r * 299 + g * 587 + b * 114) / 1000;

/**
 * Invert the black rocket glyph to white, without touching the coloured
 * presence dot.
 *
 * Presence assets cannot be `*Template.png`: AppKit would bleach the dot to
 * the menu-bar tint as well. They also cannot follow
 * `nativeTheme.shouldUseDarkColors`. Liquid Glass keeps status items
 * light-tinted even when Appearance is Light; Template icons (and the
 * installed build) stay white. Following the Light/Dark *setting* is what
 * turned only this glyph black.
 *
 * `toBitmap()` on darwin is BGRA, straight alpha. Glyph pixels are (0,0,0,a);
 * online/away/busy are saturated; offline is mid-grey (~160 luma) so it stays.
 */
export const invertDarkAchromaticPixels = (bgra: Buffer): Buffer => {
  const out = Buffer.from(bgra);

  for (let i = 0; i + 3 < out.length; i += 4) {
    const b = out[i];
    const g = out[i + 1];
    const r = out[i + 2];
    const a = out[i + 3];

    if (a === 0) {
      continue;
    }

    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    if (saturation > CHANNEL_SATURATION_MAX) {
      continue;
    }

    if (luma(r, g, b) > LUMA_MAX) {
      continue;
    }

    out[i] = 255 - b;
    out[i + 1] = 255 - g;
    out[i + 2] = 255 - r;
  }

  return out;
};

export const applyMacOSMenuBarGlyphAppearance = (
  image: NativeImage
): NativeImage => {
  if (process.platform !== 'darwin' || image.isEmpty()) {
    return image;
  }

  const pointSize = image.getSize();
  const adapted = nativeImage.createEmpty();

  for (const scaleFactor of image.getScaleFactors()) {
    const bitmap = image.toBitmap({ scaleFactor });
    const width = Math.round(pointSize.width * scaleFactor);
    const height = Math.round(pointSize.height * scaleFactor);

    adapted.addRepresentation({
      scaleFactor,
      width,
      height,
      buffer: invertDarkAchromaticPixels(bitmap),
    });
  }

  return adapted;
};
