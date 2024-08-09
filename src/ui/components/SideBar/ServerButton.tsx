import { Server } from 'http';

import { css } from '@rocket.chat/css-in-js';
import {
  IconButton,
  Badge,
  Box,
  Dropdown,
  Option,
  MenuItem,
  OptionIcon,
  OptionContent,
  OptionDivider,
  OptionHeader,
} from '@rocket.chat/fuselage';
import type { DragEvent, MouseEvent } from 'react';
import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { dispatch } from '../../../store';
import type { RootAction } from '../../../store/actions';
import {
  SIDE_BAR_SERVER_SELECTED,
  SIDE_BAR_CONTEXT_MENU_TRIGGERED,
  WEBVIEW_SERVER_RELOADED,
  SIDE_BAR_SERVER_RELOAD,
  SIDE_BAR_SERVER_COPY_URL,
  SIDE_BAR_SERVER_OPEN_DEV_TOOLS,
  SIDE_BAR_SERVER_FORCE_RELOAD,
  SIDE_BAR_SERVER_REMOVE,
} from '../../actions';
import {
  getWebContentsByServerUrl,
  serverReloadView,
} from '../../main/serverView';
import { Avatar, Favicon, Initials, ServerButtonWrapper } from './styles';
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
  onDragStart: (event: DragEvent) => void;
  onDragEnd: (event: DragEvent) => void;
  onDragEnter: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
};

const ServerButton = ({
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
  className,
}: ServerButtonProps) => {
  const handleServerClick = (): void => {
    dispatch({ type: SIDE_BAR_SERVER_SELECTED, payload: url });
  };

  const reference = useRef(null);
  const target = useRef(null);

  const { t } = useTranslation();

  const { isVisible, toggle } = useDropdownVisibility({ reference, target });

  const initials = useMemo(
    () =>
      title
        ?.replace(url, new URL(url).hostname ?? '')
        ?.split(/[^A-Za-z0-9]+/g)
        ?.slice(0, 2)
        ?.map((text) => text.slice(0, 1).toUpperCase())
        ?.join(''),
    [title, url]
  );

  const handleActionDropdownClick = (
    action: string,
    serverUrl: string
  ): void => {
    dispatch({ type: action, payload: serverUrl });

    toggle();
  };

  // const handleServerContextMenu = (event: MouseEvent): void => {
  //   event.preventDefault();
  //   toggle();
  // };

  const handleServerContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    // dispatch({ type: SIDE_BAR_CONTEXT_MENU_TRIGGERED, payload: url });
    toggle();
  };

  return (
    <ServerButtonWrapper
      ref={reference}
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
      className={className}
    >
      <IconButton
        small
        position='relative'
        overflow='visible'
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
          {mentionCount && <Badge variant='secondary'>{mentionCount}</Badge>}
          {!userLoggedIn && <Badge variant='warning'>!</Badge>}
        </Box>
        {isVisible && (
          <Dropdown reference={reference} ref={target} placement='right-start'>
            <Box display='flex' className='rcx-option__title'>
              Workspace
            </Box>
            <Option
              onClick={() =>
                handleActionDropdownClick(SIDE_BAR_SERVER_RELOAD, url)
              }
            >
              <OptionIcon name='refresh' />
              <OptionContent>Reload</OptionContent>
            </Option>
            <Option
              onClick={() =>
                handleActionDropdownClick(SIDE_BAR_SERVER_COPY_URL, url)
              }
            >
              <OptionIcon name='copy' />
              <OptionContent>Copy current URL</OptionContent>
            </Option>
            <Option
              onClick={() =>
                handleActionDropdownClick(SIDE_BAR_SERVER_OPEN_DEV_TOOLS, url)
              }
            >
              <OptionIcon name='code-block' />
              <OptionContent>Open DevTools</OptionContent>
            </Option>
            <Option
              onClick={() =>
                handleActionDropdownClick(SIDE_BAR_SERVER_FORCE_RELOAD, url)
              }
            >
              <OptionIcon name='refresh' />
              <OptionContent>Force reload</OptionContent>
            </Option>
            <OptionDivider />
            <Option
              onClick={() =>
                handleActionDropdownClick(SIDE_BAR_SERVER_REMOVE, url)
              }
              variant='danger'
            >
              <OptionIcon name='trash' />
              <OptionContent>Remove</OptionContent>
            </Option>
          </Dropdown>
        )}
      </IconButton>
    </ServerButtonWrapper>
  );
};

export default ServerButton;
