import { css } from '@rocket.chat/css-in-js';
import {
  Avatar,
  IconButton,
  Badge,
  Box,
  Dropdown,
  Option,
  OptionIcon,
  OptionContent,
  OptionDivider,
} from '@rocket.chat/fuselage';
import type { DragEvent, MouseEvent } from 'react';
import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { dispatch } from '../../../store';
import {
  SIDE_BAR_SERVER_SELECTED,
  SIDE_BAR_SERVER_RELOAD,
  SIDE_BAR_SERVER_COPY_URL,
  SIDE_BAR_SERVER_OPEN_DEV_TOOLS,
  SIDE_BAR_SERVER_FORCE_RELOAD,
  SIDE_BAR_SERVER_REMOVE,
} from '../../actions';
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
  onDragStart: (event: DragEvent) => void;
  onDragEnd: (event: DragEvent) => void;
  onDragEnter: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
};

type ServerActionType =
  | typeof SIDE_BAR_SERVER_SELECTED
  | typeof SIDE_BAR_SERVER_RELOAD
  | typeof SIDE_BAR_SERVER_COPY_URL
  | typeof SIDE_BAR_SERVER_OPEN_DEV_TOOLS
  | typeof SIDE_BAR_SERVER_FORCE_RELOAD
  | typeof SIDE_BAR_SERVER_REMOVE;

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
    action: ServerActionType,
    serverUrl: string
  ): void => {
    if (action) dispatch({ type: action, payload: serverUrl });
    toggle();
  };

  const handleServerContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    // dispatch({ type: SIDE_BAR_CONTEXT_MENU_TRIGGERED, payload: url });
    toggle();
  };

  const tooltipContent = `
  ${title} (${process.platform === 'darwin' ? '⌘' : '^'}+${shortcutNumber})
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
        onDragOver={(event) => event.preventDefault()}
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
          // className={[isSelected && 'is-focused'].filter(Boolean).join(' ')}
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
            {mentionCount && <Badge variant='secondary'>{mentionCount}</Badge>}
            {!userLoggedIn && <Badge variant='warning'>!</Badge>}
          </Box>
        </IconButton>
      </ServerButtonWrapper>
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
            <OptionContent>{t('sidebar.item.reload')}</OptionContent>
          </Option>
          <Option
            onClick={() =>
              handleActionDropdownClick(SIDE_BAR_SERVER_COPY_URL, url)
            }
          >
            <OptionIcon name='copy' />
            <OptionContent>{t('sidebar.item.copyCurrentUrl')}</OptionContent>
          </Option>
          <Option
            onClick={() =>
              handleActionDropdownClick(SIDE_BAR_SERVER_OPEN_DEV_TOOLS, url)
            }
          >
            <OptionIcon name='code-block' />
            <OptionContent>{t('sidebar.item.openDevTools')}</OptionContent>
          </Option>
          <Option
            onClick={() =>
              handleActionDropdownClick(SIDE_BAR_SERVER_FORCE_RELOAD, url)
            }
          >
            <OptionIcon name='refresh' />
            <OptionContent>
              {t('sidebar.item.reloadClearingCache')}
            </OptionContent>
          </Option>
          <OptionDivider />
          <Option
            onClick={(event) => {
              event?.stopPropagation();
              handleActionDropdownClick(SIDE_BAR_SERVER_REMOVE, url);
            }}
            variant='danger'
          >
            <OptionIcon name='trash' />
            <OptionContent>{t('sidebar.item.remove')}</OptionContent>
          </Option>
        </Dropdown>
      )}
    </>
  );
};

export default ServerButton;
