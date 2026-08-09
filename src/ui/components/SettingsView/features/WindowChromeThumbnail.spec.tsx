import '@testing-library/jest-dom';
import { render } from '@testing-library/react';

import { WindowChromeThumbnail } from './WindowChromeThumbnail';

const MAC_CLOSE_BUTTON = '#ff5f57';
const DARK_CHROME = '#3c3f46';
const LIGHT_CHROME = '#dfe3e8';

const draw = (
  props: Partial<React.ComponentProps<typeof WindowChromeThumbnail>> = {}
) =>
  render(
    <WindowChromeThumbnail
      layout='tabs'
      theme='dark'
      platform='darwin'
      idPrefix='t'
      {...props}
    />
  ).container;

describe('WindowChromeThumbnail', () => {
  it('draws a decorative svg, hidden from assistive tech', () => {
    const svg = draw().querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
  });

  describe('window controls', () => {
    it('puts traffic lights on macOS', () => {
      const container = draw({ platform: 'darwin' });
      expect(
        container.querySelector(`[fill="${MAC_CLOSE_BUTTON}"]`)
      ).toBeInTheDocument();
    });

    it('puts minimise, maximise and close on Windows instead', () => {
      const container = draw({ platform: 'win32' });
      expect(
        container.querySelector(`[fill="${MAC_CLOSE_BUTTON}"]`)
      ).not.toBeInTheDocument();
      // The minimise stroke starts at the trailing edge of the strip.
      expect(container.querySelector('path[d^="M130"]')).toBeInTheDocument();
    });

    it('draws none on Linux, which keeps its native title bar', () => {
      const container = draw({ platform: 'linux' });
      expect(
        container.querySelector(`[fill="${MAC_CLOSE_BUTTON}"]`)
      ).not.toBeInTheDocument();
      expect(
        container.querySelector('path[d^="M130"]')
      ).not.toBeInTheDocument();
    });
  });

  describe('theme', () => {
    it('uses the dark palette for dark', () => {
      const container = draw({ theme: 'dark' });
      expect(
        container.querySelector(`[fill="${DARK_CHROME}"]`)
      ).toBeInTheDocument();
      expect(
        container.querySelector(`[fill="${LIGHT_CHROME}"]`)
      ).not.toBeInTheDocument();
    });

    it('uses the light palette for light', () => {
      const container = draw({ theme: 'light' });
      expect(
        container.querySelector(`[fill="${LIGHT_CHROME}"]`)
      ).toBeInTheDocument();
      expect(
        container.querySelector(`[fill="${DARK_CHROME}"]`)
      ).not.toBeInTheDocument();
    });

    it('draws both palettes behind a diagonal clip for auto', () => {
      const container = draw({ theme: 'auto' });
      expect(
        container.querySelector(`[fill="${DARK_CHROME}"]`)
      ).toBeInTheDocument();
      expect(
        container.querySelector(`[fill="${LIGHT_CHROME}"]`)
      ).toBeInTheDocument();
      expect(container.querySelector('clipPath')).toBeInTheDocument();
    });

    it('scopes the clip id so two thumbnails cannot collide', () => {
      const first = draw({ theme: 'auto', idPrefix: 'one' });
      const second = draw({ theme: 'auto', idPrefix: 'two' });
      expect(first.querySelector('clipPath')).toHaveAttribute(
        'id',
        'one-auto-clip'
      );
      expect(second.querySelector('clipPath')).toHaveAttribute(
        'id',
        'two-auto-clip'
      );
    });
  });

  describe('layout', () => {
    it('draws a workspace column for sidebar', () => {
      const container = draw({ layout: 'sidebar' });
      expect(container.querySelectorAll('rect[rx="3.6"]')).toHaveLength(3);
    });

    it('draws no workspace column for tabs or hidden', () => {
      expect(
        draw({ layout: 'tabs' }).querySelectorAll('rect[rx="3.6"]')
      ).toHaveLength(0);
      expect(
        draw({ layout: 'hidden' }).querySelectorAll('rect[rx="3.6"]')
      ).toHaveLength(0);
    });

    it('draws the switcher chevron only for hidden', () => {
      expect(
        draw({ layout: 'hidden' }).querySelectorAll('rect[rx="2.2"]')
      ).toHaveLength(1);
      expect(
        draw({ layout: 'tabs' }).querySelectorAll('rect[rx="2.2"]')
      ).toHaveLength(0);
    });

    it('rounds the window less on Windows than on macOS', () => {
      const mac = draw({ platform: 'darwin' }).querySelector('rect');
      const win = draw({ platform: 'win32' }).querySelector('rect');
      expect(mac).toHaveAttribute('rx', '11');
      expect(win).toHaveAttribute('rx', '6');
    });
  });
});
