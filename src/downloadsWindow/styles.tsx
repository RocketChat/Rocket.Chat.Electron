import { Global, css } from '@emotion/react';

import type { Surfaces } from '../ui/windowChrome/appearance';

export const DOWNLOAD_ROW_CLASS = 'rcx-download-row';
export const DOWNLOAD_NAME_CLASS = 'rcx-download-row__name';

type DownloadsGlobalStylesProps = {
  surfaces: Surfaces;
};

/**
 * Row hover, kept in a stylesheet so a pointer move over the list does not
 * re-render rows. The row actions stay visible rather than appearing on hover —
 * a download's controls are the point of the list.
 */
export const DownloadsGlobalStyles = ({
  surfaces,
}: DownloadsGlobalStylesProps) => (
  <Global
    styles={css`
      .${DOWNLOAD_ROW_CLASS}:hover {
        background-color: ${surfaces.hover};
      }

      /*
       * Underlined only on hover: every finished download's name is clickable,
       * and underlining them all would make the list look like link soup.
       */
      .${DOWNLOAD_NAME_CLASS}:hover, .${DOWNLOAD_NAME_CLASS}:focus-visible {
        text-decoration: underline;
      }
    `}
  />
);
