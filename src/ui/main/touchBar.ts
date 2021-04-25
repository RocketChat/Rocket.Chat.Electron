import {
  TouchBar,
  nativeImage,
  app,
  TouchBarScrubber,
  TouchBarPopover,
  TouchBarSegmentedControl,
} from 'electron';
import i18next from 'i18next';

import { Server } from '../../servers/common';
import { select, dispatch, Service } from '../../store';
import { RootState } from '../../store/rootReducer';
import {
  TOUCH_BAR_SELECT_SERVER_TOUCHED,
  TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
} from '../actions';
import { getRootWindow } from './rootWindow';

const t = i18next.t.bind(i18next);

const ids = ['bold', 'italic', 'strike', 'inline_code', 'multi_line'] as const;

const createTouchBar = (): [
  TouchBar,
  TouchBarPopover,
  TouchBarScrubber,
  TouchBarSegmentedControl
] => {
  const serverSelectionScrubber = new TouchBar.TouchBarScrubber({
    selectedStyle: 'background',
    mode: 'free',
    continuous: false,
    items: [],
    select: async (index) => {
      const browserWindow = await getRootWindow();

      if (!browserWindow.isVisible()) {
        browserWindow.showInactive();
      }
      browserWindow.focus();

      const url = select(({ servers }) => servers[index].url);
      dispatch({ type: TOUCH_BAR_SELECT_SERVER_TOUCHED, payload: url });
    },
  });

  const serverSelectionPopover = new TouchBar.TouchBarPopover({
    label: t('touchBar.selectServer'),
    icon: undefined,
    items: new TouchBar({
      items: [serverSelectionScrubber],
    }),
    showCloseButton: true,
  });

  const messageBoxFormattingButtons = new TouchBar.TouchBarSegmentedControl({
    mode: 'buttons',
    segments: ids.map((id) => ({
      icon: nativeImage.createFromPath(
        `${app.getAppPath()}/app/images/touch-bar/${id}.png`
      ),
      enabled: false,
    })),
    change: async (selectedIndex) => {
      const browserWindow = await getRootWindow();

      if (!browserWindow.isVisible()) {
        browserWindow.showInactive();
      }
      browserWindow.focus();

      dispatch({
        type: TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
        payload: ids[selectedIndex],
      });
    },
  });

  const touchBar = new TouchBar({
    items: [
      serverSelectionPopover,
      new TouchBar.TouchBarSpacer({ size: 'flexible' }),
      messageBoxFormattingButtons,
      new TouchBar.TouchBarSpacer({ size: 'flexible' }),
    ],
  });

  getRootWindow().then((browserWindow) => browserWindow.setTouchBar(touchBar));

  return [
    touchBar,
    serverSelectionPopover,
    serverSelectionScrubber,
    messageBoxFormattingButtons,
  ];
};

const updateServerSelectionPopover = (
  serverSelectionPopover: TouchBarPopover,
  currentServer: Server | null
): void => {
  serverSelectionPopover.label =
    currentServer?.title ?? t('touchBar.selectServer');
  serverSelectionPopover.icon = currentServer?.favicon
    ? nativeImage.createFromDataURL(currentServer?.favicon)
    : nativeImage.createEmpty();
};

const updateServerSelectionScrubber = (
  serverSelectionScrubber: TouchBarScrubber,
  servers: Server[]
): void => {
  serverSelectionScrubber.items = servers.map((server) => ({
    label: server.title?.padEnd(30),
    icon: server.favicon
      ? nativeImage.createFromDataURL(server.favicon)
      : undefined,
  }));
};

const toggleMessageFormattingButtons = (
  messageBoxFormattingButtons: TouchBarSegmentedControl,
  isEnabled: boolean
): void => {
  messageBoxFormattingButtons.segments.forEach((segment) => {
    segment.enabled = isEnabled;
  });
};

const selectCurrentServer = ({
  servers,
  currentView,
}: RootState): Server | null =>
  typeof currentView === 'object'
    ? servers.find(({ url }) => url === currentView.url) ?? null
    : null;

class TouchBarService extends Service {
  protected initialize(): void {
    if (process.platform !== 'darwin') {
      return;
    }

    const [
      touchBar,
      serverSelectionPopover,
      serverSelectionScrubber,
      messageBoxFormattingButtons,
    ] = createTouchBar();

    this.watch(selectCurrentServer, (currentServer) => {
      updateServerSelectionPopover(serverSelectionPopover, currentServer);
      getRootWindow().then((browserWindow) =>
        browserWindow.setTouchBar(touchBar)
      );
    });

    this.watch(
      ({ servers }) => servers,
      (servers) => {
        updateServerSelectionScrubber(serverSelectionScrubber, servers);
        getRootWindow().then((browserWindow) =>
          browserWindow.setTouchBar(touchBar)
        );
      }
    );

    this.watch(
      ({ isMessageBoxFocused }) => isMessageBoxFocused ?? false,
      (isMessageBoxFocused) => {
        toggleMessageFormattingButtons(
          messageBoxFormattingButtons,
          isMessageBoxFocused
        );
        getRootWindow().then((browserWindow) =>
          browserWindow.setTouchBar(touchBar)
        );
      }
    );
  }
}

export default new TouchBarService();
