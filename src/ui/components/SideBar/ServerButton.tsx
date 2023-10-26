import { parse } from 'url';

import { css } from '@rocket.chat/css-in-js';
import { IconButton, Badge, Box } from '@rocket.chat/fuselage';
import type { FC, DragEvent, MouseEvent } from 'react';
import React, { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../store/actions';
import {
  SIDE_BAR_SERVER_SELECTED,
  SIDE_BAR_CONTEXT_MENU_TRIGGERED,
} from '../../actions';
import {
  Avatar,
  Favicon,
  Initials,
  KeyboardShortcut,
  ServerButtonWrapper,
} from './styles';

type ServerButtonProps = {
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
  onDragStart: (event: DragEvent) => void;
  onDragEnd: (event: DragEvent) => void;
  onDragEnter: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
};

const ServerButton: FC<ServerButtonProps> = ({
  url,
  title,
  shortcutNumber,
  isSelected,
  favicon,
  isShortcutVisible,
  hasUnreadMessages,
  mentionCount,
  userLoggedIn,
  isDragged,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDrop,
}) => {
  const dispatch = useDispatch<Dispatch<RootAction>>();

  const handleServerClick = (): void => {
    dispatch({ type: SIDE_BAR_SERVER_SELECTED, payload: url });
  };

  const initials = useMemo(
    () =>
      title
        ?.replace(url, parse(url).hostname ?? '')
        ?.split(/[^A-Za-z0-9]+/g)
        ?.slice(0, 2)
        ?.map((text) => text.slice(0, 1).toUpperCase())
        ?.join(''),
    [title, url]
  );

  const handleServerContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    dispatch({ type: SIDE_BAR_CONTEXT_MENU_TRIGGERED, payload: url });
  };

  return (
    <ServerButtonWrapper
      draggable='true'
      tooltip={title}
      isSelected={isSelected}
      isDragged={isDragged}
      hasUnreadMessages={hasUnreadMessages}
      onClick={handleServerClick}
      onContextMenu={handleServerContextMenu}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragEnter={onDragEnter}
      onDrop={onDrop}
    >
      <IconButton
        className={[isSelected && 'is-focused'].filter(Boolean).join(' ')}
        icon={
          <Avatar isSelected={isSelected}>
            <Initials visible={!favicon}>{initials}</Initials>
            <Favicon
              draggable='false'
              src={favicon ?? ''}
              visible={!!favicon}
            />
          </Avatar>
        }
      />
      <Box
        className={css`
          top: 0;
          right: 0;
          transform: translate(30%, -30%);
        `}
        position='absolute'
      >
        {mentionCount && <Badge variant='danger'>{mentionCount}</Badge>}
        {!userLoggedIn && <Badge variant='danger'>!</Badge>}
      </Box>
      {shortcutNumber && (
        <KeyboardShortcut visible={isShortcutVisible}>
          {process.platform === 'darwin' ? '⌘' : '^'}
          {shortcutNumber}
        </KeyboardShortcut>
      )}
    </ServerButtonWrapper>
  );
};

export default ServerButton;
