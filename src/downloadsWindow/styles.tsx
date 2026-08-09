import { Global, css } from '@emotion/react';

export const DOWNLOAD_NAME_CLASS = 'rcx-download-row__name';

/**
 * Underlined only on hover: every finished download's name is clickable, and
 * underlining them all would make the list look like link soup.
 */
export const DownloadsGlobalStyles = () => (
  <Global
    styles={css`
      .${DOWNLOAD_NAME_CLASS}:hover, .${DOWNLOAD_NAME_CLASS}:focus-visible {
        text-decoration: underline;
      }
    `}
  />
);
