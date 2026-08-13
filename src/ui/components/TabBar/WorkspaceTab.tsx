import type {
  DragEvent,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
} from 'react';
import { useContext, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { dispatch } from '../../../store';
import {
  SERVER_CONTEXT_MENU_TRIGGERED,
  SIDE_BAR_SERVER_SELECTED,
} from '../../actions';
import { isDarwin } from '../../utils/platform';
import { TooltipContext } from '../utils/TooltipContext';
import { formatServerTitle } from '../utils/formatServerTitle';
import { getServerPanelId, getServerTabId } from '../utils/getServerDomId';
import { getServerInitials } from '../utils/getServerInitials';
import {
  BadgeWrapper,
  Divider,
  Favicon,
  Initials,
  Label,
  ShortcutChip,
  Tab,
  TabBadge,
  UnreadDot,
  UnreadDotBadge,
} from './styles';
import type { TabOrientation } from './styles';

const formatMentionCount = (count: number | undefined): string | undefined => {
  if (count === undefined) {
    return undefined;
  }

  return count > 99 ? '99+' : String(count);
};

// Some servers embed their address in the title (e.g.
// "Rocket.Chat - https://stable.rocket.chat/"). Strip it out so the tooltip can
// show the name on its own line. Returns '' when the title is only the address.
const removeServerAddress = (title: string, serverAddress: string): string => {
  const index = title.toLowerCase().indexOf(serverAddress.toLowerCase());

  if (index === -1) {
    return title.trim();
  }

  const before = title.slice(0, index);
  const after = title.slice(index + serverAddress.length).replace(/^\/+/, '');

  return `${before}${after}`.replace(/^[\s\-–—|·:]+|[\s\-–—|·:]+$/g, '').trim();
};

type WorkspaceTabProps = {
  url: string;
  title: string;
  favicon: string | null;
  isSelected: boolean;
  badge?: '•' | number;
  userLoggedIn?: boolean;
  compact: boolean;
  orientation?: TabOrientation;
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
  compact,
  orientation = 'horizontal',
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
  const hasUnreadMessages = badge !== undefined && typeof badge !== 'number';

  const shortcutSuffix =
    shortcutNumber && Number(shortcutNumber) >= 1 && Number(shortcutNumber) <= 9
      ? ` (${isDarwin ? '⌘' : 'Ctrl+'}${shortcutNumber})`
      : '';

  const getUnreadSuffix = (): string => {
    if (mentionCount !== undefined) {
      return ` — ${t('tabBar.unreadMessage', { count: mentionCount })}`;
    }

    if (hasUnreadMessages) {
      return ` — ${t('tabBar.unreadMessages')}`;
    }

    return '';
  };

  const unreadSuffix = getUnreadSuffix();

  const serverAddress = url.replace(/\/+$/, '');
  const tooltipName = removeServerAddress(title, serverAddress);
  const tooltipPrimaryLine = `${
    tooltipName || serverAddress
  }${unreadSuffix}${shortcutSuffix}`;
  // Show the name on the first line and the address on a second line. When the
  // title is only the address, the primary line already is it, so skip line two.
  const tooltipLines = tooltipName
    ? [tooltipPrimaryLine, serverAddress]
    : [tooltipPrimaryLine];
  // The TooltipProvider renders each '\n'-separated line on its own row, so the
  // native title, the custom hover tooltip and the aria-label all stay in sync.
  const tooltipText = tooltipLines.join('\n');
  const tooltipNode = (
    <>
      {tooltipLines.map((line, index) => (
        <div key={index}>{line}</div>
      ))}
    </>
  );

  const handleClick = (): void => {
    dispatch({ type: SIDE_BAR_SERVER_SELECTED, payload: url });
  };

  const handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    dispatch({
      type: SERVER_CONTEXT_MENU_TRIGGERED,
      payload: { x: event.clientX, y: event.clientY, url },
    });
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  const handleFocus = (event: FocusEvent<HTMLButtonElement>): void => {
    tooltip.open(tooltipNode, event.currentTarget);
  };

  const handleBlur = (): void => {
    tooltip.close();
  };

  const isVertical = orientation === 'vertical';
  const showLabel = !compact && !isVertical;

  // Exactly one badge at a time: a logged-out server's unread state is stale,
  // so the login warning wins; otherwise a mention count beats the plain
  // unread dot. The unread indicator itself depends on the layout: the
  // sidebar (vertical) gets the badge with the drawn dot, the tab strip
  // keeps the plain 8px ball.
  const badgeElement = ((): ReactNode => {
    if (!userLoggedIn) {
      return <TabBadge variant='warning'>!</TabBadge>;
    }
    if (displayCount) {
      return <TabBadge variant='ghost'>{displayCount}</TabBadge>;
    }
    if (hasUnreadMessages) {
      return isVertical ? (
        <UnreadDotBadge variant='ghost' />
      ) : (
        <UnreadDot variant='ghost' />
      );
    }
    return null;
  })();

  return (
    <>
      <Tab
        ref={ref}
        id={getServerTabId(url)}
        role='tab'
        aria-selected={isSelected}
        aria-controls={getServerPanelId(url)}
        tabIndex={tabIndex}
        isSelected={isSelected}
        isCompact={compact}
        orientation={orientation}
        title={tooltipText}
        data-tooltip-placement={isVertical ? 'right' : undefined}
        aria-label={tooltipText}
        draggable='true'
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onDragOver={(event: DragEvent) => event.preventDefault()}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragEnter={onDragEnter}
        onDrop={onDrop}
      >
        <Initials visible={!favicon} orientation={orientation}>
          {initials}
        </Initials>
        {favicon && (
          <Favicon
            visible
            src={favicon}
            draggable='false'
            orientation={orientation}
          />
        )}
        {showLabel && <Label>{formatServerTitle(title)}</Label>}
        {showLabel && isShortcutVisible && shortcutNumber && (
          <ShortcutChip>{shortcutNumber}</ShortcutChip>
        )}
        {isVertical ? (
          <BadgeWrapper>{badgeElement}</BadgeWrapper>
        ) : (
          badgeElement
        )}
      </Tab>
      <Divider orientation={orientation}></Divider>
    </>
  );
};

export default WorkspaceTab;
