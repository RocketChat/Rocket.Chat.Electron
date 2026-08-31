import type { ReactNode } from 'react';

import type { NavigationLayout } from '../../../common';
import { THUMBNAIL_HEIGHT, THUMBNAIL_WIDTH } from './thumbnailMetrics';

export type ThumbnailTheme = 'light' | 'dark' | 'auto';
export type ThumbnailPlatform = 'darwin' | 'win32' | 'linux';

const WIDTH = THUMBNAIL_WIDTH;
const HEIGHT = THUMBNAIL_HEIGHT;

/**
 * Literal colours rather than palette tokens — deliberately.
 *
 * These thumbnails are the one place in the app that must NOT follow the current
 * theme: the Light option has to look light while the user is sitting in dark
 * mode. Tokens would render all three identically.
 */
type ThumbnailPalette = {
  chrome: string;
  content: string;
  edge: string;
  active: string;
  muted: string;
  item: string;
  faint: string;
};

const PALETTES: Record<'light' | 'dark', ThumbnailPalette> = {
  light: {
    chrome: '#dfe3e8',
    content: '#ffffff',
    edge: 'rgba(0, 0, 0, 0.13)',
    active: '#ffffff',
    muted: '#8a9099',
    item: '#b3b9c0',
    faint: 'rgba(0, 0, 0, 0.16)',
  },
  dark: {
    chrome: '#3c3f46',
    content: '#23262d',
    edge: 'rgba(255, 255, 255, 0.09)',
    active: '#4d5158',
    muted: '#9ea3aa',
    item: '#71777f',
    faint: 'rgba(255, 255, 255, 0.18)',
  },
};

/** macOS rounds its windows far more than Windows does. */
const getRadii = (platform: ThumbnailPlatform) =>
  platform === 'darwin' ? { window: 11, card: 8 } : { window: 6, card: 5 };

const STRIP_HEIGHT: Record<NavigationLayout, number> = {
  tabs: 27,
  sidebar: 23,
  hidden: 23,
};

const bar = (
  key: string,
  x: number,
  y: number,
  width: number,
  fill: string
): ReactNode => (
  <rect key={key} x={x} y={y} width={width} height={2.4} rx={1.2} fill={fill} />
);

const plus = (cx: number, cy: number, stroke: string): ReactNode => (
  <path
    key='plus'
    d={`M${cx - 3} ${cy}h6M${cx} ${cy - 3}v6`}
    stroke={stroke}
    strokeWidth={1.3}
    strokeLinecap='round'
  />
);

/** Three dots, horizontal for the overflow menu and vertical for the kebab. */
const dotTriplet = (
  key: string,
  cx: number,
  cy: number,
  fill: string,
  vertical: boolean
): ReactNode => (
  <g key={key}>
    {[-1, 0, 1].map((offset) => (
      <circle
        key={offset}
        cx={vertical ? cx : cx + offset * 3.6}
        cy={vertical ? cy + offset * 3.6 : cy}
        r={1.15}
        fill={fill}
      />
    ))}
  </g>
);

/**
 * macOS draws traffic lights at the leading edge; Windows draws minimise,
 * maximise and close at the trailing edge. Linux keeps its native title bar, so
 * the app draws no controls at all.
 */
const windowControls = (
  platform: ThumbnailPlatform,
  cy: number,
  palette: ThumbnailPalette
): ReactNode => {
  if (platform === 'darwin') {
    return (
      <g key='controls'>
        <circle cx={9.5} cy={cy} r={2.7} fill='#ff5f57' />
        <circle cx={18} cy={cy} r={2.7} fill='#febc2e' />
        <circle cx={26.5} cy={cy} r={2.7} fill='#28c840' />
      </g>
    );
  }

  if (platform === 'linux') {
    return null;
  }

  return (
    <g
      key='controls'
      stroke={palette.muted}
      strokeWidth={1.1}
      fill='none'
      strokeLinecap='round'
    >
      <path d={`M130 ${cy}h7`} />
      <rect x={144} y={cy - 3} width={6} height={6} rx={1} />
      <path d={`M157 ${cy - 3}l6 6M163 ${cy - 3}l-6 6`} />
    </g>
  );
};

const contentCard = (
  platform: ThumbnailPlatform,
  palette: ThumbnailPalette,
  x: number,
  top: number
): ReactNode => (
  <rect
    key='card'
    x={x}
    y={top}
    width={WIDTH - x - 4}
    height={HEIGHT - top - 5}
    rx={getRadii(platform).card}
    fill={palette.content}
    stroke={palette.edge}
    strokeWidth={1}
  />
);

const drawLayout = (
  layout: NavigationLayout,
  platform: ThumbnailPlatform,
  palette: ThumbnailPalette
): ReactNode => {
  const strip = STRIP_HEIGHT[layout];
  const cy = strip / 2;
  const isMac = platform === 'darwin';
  const parts: ReactNode[] = [
    <rect
      key='shell'
      width={WIDTH}
      height={HEIGHT}
      rx={getRadii(platform).window}
      fill={palette.chrome}
    />,
    windowControls(platform, cy, palette),
  ];

  if (layout === 'tabs') {
    // Windows and Linux put the overflow menu at the leading edge, where macOS
    // has its traffic lights.
    const tabsStart = isMac ? 34 : 24;
    if (!isMac) {
      parts.push(dotTriplet('menu', 11, cy, palette.muted, false));
    }
    parts.push(
      <rect
        key='active-tab'
        x={tabsStart}
        y={4.5}
        width={46}
        height={18}
        rx={4.5}
        fill={palette.active}
      />,
      bar('active-title', tabsStart + 6, 12.5, 33, palette.muted),
      <path
        key='divider'
        d={`M${tabsStart + 50} 8v11`}
        stroke={palette.faint}
        strokeWidth={1}
      />,
      bar('next-title', tabsStart + 57, 12.5, isMac ? 32 : 24, palette.item),
      plus(tabsStart + (isMac ? 100 : 90), 13.5, palette.muted)
    );
    parts.push(contentCard(platform, palette, 4, strip + 1));
    return parts;
  }

  // macOS centres the window title; Windows and Linux align it to the leading
  // edge, after the overflow menu.
  if (layout === 'sidebar') {
    parts.push(
      isMac
        ? bar('title', 58, cy - 1.2, 52, palette.muted)
        : bar('title', 10, cy - 1.2, 56, palette.muted)
    );
    [29, 46, 63].forEach((y, index) => {
      const isCurrent = index === 0;
      parts.push(
        <rect
          key={`workspace-${y}`}
          x={6.5}
          y={y}
          width={13}
          height={13}
          rx={3.6}
          fill={isCurrent ? palette.muted : palette.item}
        />
      );
      if (isCurrent) {
        parts.push(
          <rect
            key='current-workspace'
            x={4.5}
            y={y - 2}
            width={17}
            height={17}
            rx={5}
            fill='none'
            stroke={palette.faint}
            strokeWidth={1}
          />
        );
      }
    });
    parts.push(plus(13, 82, palette.muted));
    // For this layout the overflow menu lives in the workspace column.
    parts.push(dotTriplet('menu', 13, 99, palette.muted, true));
    parts.push(contentCard(platform, palette, 26, strip + 1));
    return parts;
  }

  // 'hidden': the workspace switcher sits in the title bar next to the title.
  if (!isMac) {
    parts.push(dotTriplet('menu', 11, cy, palette.muted, false));
  }
  const titleX = isMac ? 51 : 62;
  const chevronX = titleX + (isMac ? 57 : 47);
  parts.push(
    bar('title', titleX, cy - 1.2, isMac ? 54 : 44, palette.muted),
    <rect
      key='switcher'
      x={chevronX}
      y={6.5}
      width={9}
      height={9}
      rx={2.2}
      fill={palette.faint}
    />,
    <path
      key='chevron'
      d={`M${chevronX + 2.3} 10l2.2 2.2 2.2-2.2`}
      stroke={palette.muted}
      strokeWidth={1.1}
      fill='none'
      strokeLinecap='round'
    />,
    contentCard(platform, palette, 4, strip + 1)
  );
  return parts;
};

export type WindowChromeThumbnailProps = {
  layout: NavigationLayout;
  theme: ThumbnailTheme;
  platform?: ThumbnailPlatform;
  /** Unique across the page: SVG clip paths are referenced by id. */
  idPrefix: string;
};

/**
 * Schematic preview of the app window, used by both the navigation layout and
 * the appearance pickers — the same drawing, one palette each.
 *
 * Drawn rather than screenshotted so it themes itself, stays sharp at any DPI,
 * needs no asset pipeline and cannot drift out of date as the chrome changes.
 */
export const WindowChromeThumbnail = ({
  layout,
  theme,
  platform,
  idPrefix,
}: WindowChromeThumbnailProps) => {
  const resolvedPlatform: ThumbnailPlatform =
    platform ??
    (process.platform === 'darwin' || process.platform === 'win32'
      ? process.platform
      : 'linux');
  const clipId = `${idPrefix}-auto-clip`;

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{
        display: 'block',
        borderRadius: `${getRadii(resolvedPlatform).window - 2}px`,
      }}
      aria-hidden
      focusable='false'
    >
      {theme === 'auto' ? (
        <>
          {drawLayout(layout, resolvedPlatform, PALETTES.dark)}
          <clipPath id={clipId}>
            <path d={`M0 ${HEIGHT} L${WIDTH} 0 L0 0 Z`} />
          </clipPath>
          <g clipPath={`url(#${clipId})`}>
            {drawLayout(layout, resolvedPlatform, PALETTES.light)}
          </g>
        </>
      ) : (
        drawLayout(layout, resolvedPlatform, PALETTES[theme])
      )}
    </svg>
  );
};
