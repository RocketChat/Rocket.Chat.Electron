import type { DragEvent, FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import { useContext, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { SupportedVersions } from '../../../servers/supportedVersions/types';
import { dispatch } from '../../../store';
import { SIDE_BAR_SERVER_SELECTED } from '../../actions';
import { isDarwin } from '../../utils/platform';
import { useDropdownVisibility } from '../SideBar/useDropdownVisibility';
import WorkspaceContextMenu from '../WorkspaceContextMenu';
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
  version?: string;
  isSupportedVersion?: boolean;
  supportedVersionsSource?: 'server' | 'cloud' | 'builtin';
  supportedVersionsFetchState?: 'idle' | 'loading' | 'success' | 'error';
  supportedVersions?: SupportedVersions;
  exchangeUrl?: string;
  showAddWorkspace?: boolean;
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
  version,
  isSupportedVersion,
  supportedVersionsSource,
  supportedVersionsFetchState,
  supportedVersions,
  exchangeUrl,
  showAddWorkspace,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDrop,
}: WorkspaceTabProps) => {
  const { t } = useTranslation();
  const tooltip = useContext(TooltipContext);
  const ref = useRef<HTMLButtonElement>(null);
  const target = useRef(null);

  const { isVisible, toggle } = useDropdownVisibility({
    reference: ref,
    target,
  });

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
    toggle();
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

  const badges = (
    <>
      {displayCount && <TabBadge variant='secondary'>{displayCount}</TabBadge>}
      {isVertical && !displayCount && badge === '•' && <UnreadDot />}
      {!userLoggedIn && <TabBadge variant='warning'>!</TabBadge>}
    </>
  );

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
        <Favicon
          visible={!!favicon}
          src={favicon ?? ''}
          draggable='false'
          orientation={orientation}
        />
        {showLabel && <Label>{formatServerTitle(title)}</Label>}
        {showLabel && isShortcutVisible && shortcutNumber && (
          <ShortcutChip>{shortcutNumber}</ShortcutChip>
        )}
        {isVertical ? <BadgeWrapper>{badges}</BadgeWrapper> : badges}
      </Tab>
      <Divider orientation={orientation}></Divider>
      {isVisible && (
        <WorkspaceContextMenu
          reference={ref}
          target={target}
          url={url}
          version={version}
          exchangeUrl={exchangeUrl}
          isSupportedVersion={isSupportedVersion}
          supportedVersionsSource={supportedVersionsSource}
          supportedVersionsFetchState={supportedVersionsFetchState}
          supportedVersions={supportedVersions}
          onClose={() => toggle(false)}
          showAddWorkspace={showAddWorkspace}
          placement={isVertical ? 'right-start' : 'bottom-start'}
        />
      )}
    </>
  );
};

export default WorkspaceTab;
