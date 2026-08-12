import { Box } from '@rocket.chat/fuselage';
import { useMemo } from 'react';

import { getFileLabel } from './fileTypes';

const WIDTH = 36;
const HEIGHT = 44;

/** Page outline with the top-right corner cut away, and the fold that fills it. */
const PAGE_PATH =
  'M 4 1 H 22.5 L 35 13.5 V 40 Q 35 43 32 43 H 4 Q 1 43 1 40 V 4 Q 1 1 4 1 Z';
const FOLD_PATH = 'M 22.5 1 L 35 13.5 H 25.5 Q 22.5 13.5 22.5 10.5 Z';

export type FileTypeIconProps = {
  fileName: string;
  mimeType?: string;
};

/**
 * The file as a document with a folded corner.
 *
 * Drawn inline rather than loaded as an image so its fill, outline and label all
 * come from the palette: the old asset was a fixed white page, which read as a
 * bright block on the dark window. Deliberately monochrome — the icon is there
 * to identify a row, not to compete with the file name for attention — and every
 * colour is a neutral at low alpha over whatever is behind it, so one drawing
 * works on both themes.
 */
const NEUTRAL = 'var(--rcx-color-font-annotation)';
export const FileTypeIcon = ({ fileName, mimeType }: FileTypeIconProps) => {
  const label = useMemo(
    () => getFileLabel(fileName, mimeType),
    [fileName, mimeType]
  );

  return (
    <Box
      flexShrink={0}
      aria-hidden
      style={{
        position: 'relative',
        width: `${WIDTH}px`,
        height: `${HEIGHT}px`,
        color: 'var(--rcx-color-font-hint)',
      }}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={WIDTH}
        height={HEIGHT}
        style={{ display: 'block' }}
      >
        <path
          d={PAGE_PATH}
          fill={`color-mix(in srgb, ${NEUTRAL} 12%, transparent)`}
          stroke={`color-mix(in srgb, ${NEUTRAL} 34%, transparent)`}
          strokeWidth={1.5}
        />
        <path
          d={FOLD_PATH}
          fill={`color-mix(in srgb, ${NEUTRAL} 26%, transparent)`}
        />
      </svg>

      <Box
        display='flex'
        alignItems='center'
        justifyContent='center'
        fontScale='micro'
        style={{
          position: 'absolute',
          insetInline: '3px',
          insetBlockEnd: '7px',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          lineHeight: 1,
        }}
      >
        {label}
      </Box>
    </Box>
  );
};
