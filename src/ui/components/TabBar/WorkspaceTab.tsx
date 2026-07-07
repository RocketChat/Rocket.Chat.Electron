import { Badge } from '@rocket.chat/fuselage';
import type { DragEvent, FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import { useContext, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { dispatch } from '../../../store';
import {
  SIDE_BAR_CONTEXT_MENU_TRIGGERED,
  SIDE_BAR_SERVER_SELECTED,
} from '../../actions';
import { isDarwin } from '../../utils/platform';
import { TooltipContext } from '../utils/TooltipContext';
import { getServerInitials } from '../utils/getServerInitials';
import { Favicon, Initials, Label, ShortcutChip, Tab } from './styles';

const formatMentionCount = (count: number | undefined): string | undefined => {
  if (count === undefined) {
    return undefined;
  }

  return count > 99 ? '99+' : String(count);
};

type WorkspaceTabProps = {
  url: string;
  title: string;
  favicon: string | null;
  isSelected: boolean;
  badge?: '•' | number;
  userLoggedIn?: boolean;
  shortcutNumber: string | null;
  isShortcutVisible: boolean;
  tabIndex: 0 | -1;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: (event: DragEvent) => void;
  onDragEnter: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
};

const WorkspaceTab = ({
  url,
  title,
  favicon,
  isSelected,
  badge,
  userLoggedIn,
  shortcutNumber,
  isShortcutVisible,
  tabIndex,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDrop,
}: WorkspaceTabProps) => {
  const { t } = useTranslation();
  const tooltip = useContext(TooltipContext);
  const ref = useRef<HTMLButtonElement>(null);

  const initials = useMemo(() => getServerInitials(title, url), [title, url]);

  const mentionCount =
    typeof badge === 'number' && badge > 0 ? badge : undefined;
  const displayCount = formatMentionCount(mentionCount);

  const shortcutSuffix =
    shortcutNumber && Number(shortcutNumber) >= 1 && Number(shortcutNumber) <= 9
      ? ` (${isDarwin ? '⌘' : 'Ctrl+'}${shortcutNumber})`
      : '';

  const getUnreadSuffix = (): string => {
    if (mentionCount !== undefined) {
      return ` — ${t('tabBar.unreadMessage', { count: mentionCount })}`;
    }

    if (badge === '•') {
      return ` — ${t('tabBar.unreadMessages')}`;
    }

    return '';
  };

  const unreadSuffix = getUnreadSuffix();

  const tooltipText = `${title}${unreadSuffix}${shortcutSuffix}`;

  const handleClick = (): void => {
    dispatch({ type: SIDE_BAR_SERVER_SELECTED, payload: url });
  };

  const handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    dispatch({ type: SIDE_BAR_CONTEXT_MENU_TRIGGERED, payload: url });
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  const handleFocus = (event: FocusEvent<HTMLButtonElement>): void => {
    tooltip.open(<>{tooltipText}</>, event.currentTarget);
  };

  const handleBlur = (): void => {
    tooltip.close();
  };

  return (
    <Tab
      ref={ref}
      role='tab'
      aria-selected={isSelected}
      tabIndex={tabIndex}
      isSelected={isSelected}
      title={tooltipText}
      draggable='true'
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragEnter={onDragEnter}
      onDrop={onDrop}
    >
      <Initials visible={!favicon}>{initials}</Initials>
      <Favicon visible={!!favicon} src={favicon ?? ''} draggable='false' />
      <Label>{title}</Label>
      {isShortcutVisible && shortcutNumber && (
        <ShortcutChip>{shortcutNumber}</ShortcutChip>
      )}
      {displayCount && <Badge variant='secondary'>{displayCount}</Badge>}
      {!userLoggedIn && <Badge variant='warning'>!</Badge>}
    </Tab>
  );
};

export default WorkspaceTab;
