import { css } from '@rocket.chat/css-in-js';
import { Avatar, IconButton, Badge, Box } from '@rocket.chat/fuselage';
import type { DragEvent, MouseEvent } from 'react';
import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { SupportedVersions } from '../../../servers/supportedVersions/types';
import { dispatch } from '../../../store';
import { SIDE_BAR_SERVER_SELECTED } from '../../actions';
import WorkspaceContextMenu from '../WorkspaceContextMenu';
import { getServerInitials } from '../utils/getServerInitials';
import { Initials, ServerButtonWrapper } from './styles';
import { useDropdownVisibility } from './useDropdownVisibility';

type ServerButtonProps = {
  className?: string;
  url: string;
  title: string;
  shortcutNumber: string | null;
  isSelected: boolean;
  favicon: string | null;
  userLoggedIn?: boolean;
  isShortcutVisible: boolean;
  hasUnreadMessages: boolean;
  mentionCount?: number;
  isDragged: boolean;
  version?: string;
  isSupportedVersion?: boolean;
  supportedVersionsSource?: 'server' | 'cloud' | 'builtin';
  supportedVersionsFetchState?: 'idle' | 'loading' | 'success' | 'error';
  supportedVersions?: SupportedVersions;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: (event: DragEvent) => void;
  onDragEnter: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  exchangeUrl?: string;
};

const ServerButton = ({
  url,
  title,
  shortcutNumber,
  isSelected,
  favicon,
  hasUnreadMessages,
  mentionCount,
  userLoggedIn,
  isDragged,
  version,
  isSupportedVersion,
  supportedVersionsSource,
  supportedVersionsFetchState,
  supportedVersions,
  exchangeUrl,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDrop,
  className,
}: ServerButtonProps) => {
  const handleServerClick = (): void => {
    dispatch({ type: SIDE_BAR_SERVER_SELECTED, payload: url });
  };

  const reference = useRef(null);
  const target = useRef(null);

  const { t } = useTranslation();

  const { isVisible, toggle } = useDropdownVisibility({ reference, target });

  const initials = useMemo(() => getServerInitials(title, url), [title, url]);

  const handleServerContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    toggle();
  };

  const tooltipContent = `
 ${title}${shortcutNumber !== null ? ` (${process.platform === 'darwin' ? '⌘' : '^'}+${shortcutNumber})` : ''}
  ${
    hasUnreadMessages
      ? `
    ${
      mentionCount && mentionCount > 1
        ? t('sidebar.tooltips.unreadMessages', { count: mentionCount })
        : t('sidebar.tooltips.unreadMessage', { count: mentionCount })
    }`
      : ''
  }
  ${!userLoggedIn ? t('sidebar.tooltips.userNotLoggedIn') : ''}
`.trim();

  return (
    <>
      <ServerButtonWrapper
        ref={reference}
        draggable='true'
        isSelected={isSelected}
        isDragged={isDragged}
        hasUnreadMessages={hasUnreadMessages}
        onClick={handleServerClick}
        onContextMenu={handleServerContextMenu}
        onDragOver={(event: DragEvent) => event.preventDefault()}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragEnter={onDragEnter}
        onDrop={onDrop}
        className={className}
        title={tooltipContent}
      >
        <IconButton
          small
          secondary
          position='relative'
          overflow='visible'
          icon={
            <Box>
              <Initials visible={!favicon}>{initials}</Initials>
              <Box>
                {!!favicon && (
                  <Avatar
                    draggable='false'
                    url={favicon ?? ''}
                    size='x28'
                  ></Avatar>
                )}
              </Box>
            </Box>
          }
        >
          <Box
            position='absolute'
            role='status'
            className={css`
              top: 0;
              right: 0;
              transform: translate(30%, -30%);
            `}
          >
            {!!mentionCount && (
              <Badge variant='secondary'>{mentionCount}</Badge>
            )}
            {!userLoggedIn && <Badge variant='warning'>!</Badge>}
          </Box>
        </IconButton>
      </ServerButtonWrapper>
      {isVisible && (
        <WorkspaceContextMenu
          reference={reference}
          target={target}
          url={url}
          version={version}
          exchangeUrl={exchangeUrl}
          isSupportedVersion={isSupportedVersion}
          supportedVersionsSource={supportedVersionsSource}
          supportedVersionsFetchState={supportedVersionsFetchState}
          supportedVersions={supportedVersions}
          onClose={() => toggle(false)}
          placement='right-start'
        />
      )}
    </>
  );
};

export default ServerButton;
