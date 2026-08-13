import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ChangeEvent } from 'react';

import type { FacetSelection } from '../../ui/windowChrome/filters';
import { LogStatusBar } from '../LogStatusBar';
import { LogViewerSidebar } from '../LogViewerSidebar';
import { LEVEL_ACCENT } from '../appearance';
import type { LogLevel } from '../types';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const sidebarProps = {
  searchFilter: '',
  onSearchFilterChange: (_event: ChangeEvent<HTMLInputElement>) => undefined,
  levelFilters: null as FacetSelection<LogLevel>,
  availableLevels: [] as LogLevel[],
  levelCounts: {},
  onToggleLevel: () => undefined,
  contextOptions: [] as string[],
  contextLabels: {},
  contextFilters: null as FacetSelection,
  contextCounts: {},
  onToggleContext: () => undefined,
  serverOptions: [] as string[],
  serverLabels: {},
  serverFilters: null as FacetSelection,
  serverCounts: {},
  onToggleServer: () => undefined,
  showContext: true,
  onToggleShowContext: () => undefined,
  showServer: true,
  onToggleShowServer: () => undefined,
  wrapLines: false,
  onToggleWrapLines: () => undefined,
  collapseMultiline: true,
  onToggleCollapseMultiline: () => undefined,
  autoScroll: false,
  onToggleAutoScroll: () => undefined,
  showTimeline: true,
  onToggleShowTimeline: () => undefined,
  onSelectAllLevels: () => undefined,
  onSelectAllContexts: () => undefined,
  onSelectAllServers: () => undefined,
};

describe('LEVEL_ACCENT fill tokens', () => {
  it('uses status-bullet / badge fills, not status-font-on-* text tokens', () => {
    expect(LEVEL_ACCENT.error).toBe('var(--rcx-color-status-bullet-busy)');
    expect(LEVEL_ACCENT.warn).toBe('var(--rcx-color-status-bullet-away)');
    expect(LEVEL_ACCENT.info).toBe('var(--rcx-color-badge-background-level-2)');
    expect(LEVEL_ACCENT.error).not.toMatch(/status-font-on-/);
    expect(LEVEL_ACCENT.warn).not.toMatch(/status-font-on-/);
    expect(LEVEL_ACCENT.info).not.toMatch(/status-font-on-/);
  });
});

describe('LogViewerSidebar display toggles', () => {
  it('renders the six display controls as ToggleSwitches and preserves callbacks', () => {
    const onToggleShowContext = jest.fn();
    const onToggleWrapLines = jest.fn();

    render(
      <LogViewerSidebar
        {...sidebarProps}
        availableLevels={[]}
        onToggleShowContext={onToggleShowContext}
        onToggleWrapLines={onToggleWrapLines}
      />
    );

    const showContext = screen.getByRole('checkbox', {
      name: 'logViewer.controls.showContext',
    });
    const showServer = screen.getByRole('checkbox', {
      name: 'logViewer.controls.showServer',
    });
    const wrapLines = screen.getByRole('checkbox', {
      name: 'logViewer.controls.wrapLines',
    });
    const collapse = screen.getByRole('checkbox', {
      name: 'logViewer.controls.collapseMultiline',
    });
    const autoScroll = screen.getByRole('checkbox', {
      name: 'logViewer.controls.autoScrollToTop',
    });
    const showTimeline = screen.getByRole('checkbox', {
      name: 'logViewer.controls.showTimeline',
    });

    expect(showContext).toBeChecked();
    expect(showServer).toBeChecked();
    expect(wrapLines).not.toBeChecked();
    expect(collapse).toBeChecked();
    expect(autoScroll).not.toBeChecked();
    expect(showTimeline).toBeChecked();

    fireEvent.click(showContext);
    fireEvent.click(wrapLines);

    expect(onToggleShowContext).toHaveBeenCalledTimes(1);
    expect(onToggleWrapLines).toHaveBeenCalledTimes(1);
  });
});

describe('LogStatusBar live indicator', () => {
  it('renders a StatusBullet online mark while streaming', () => {
    const { container } = render(
      <LogStatusBar
        shownCount={1}
        loadedCount={1}
        isStreaming
        isLoading={false}
        canClear={false}
        onClearLogs={() => undefined}
      />
    );

    expect(
      container.querySelector('.rcx-status-bullet--online')
    ).toBeInTheDocument();
    expect(screen.getByText('logViewer.status.live')).toBeInTheDocument();
  });
});
