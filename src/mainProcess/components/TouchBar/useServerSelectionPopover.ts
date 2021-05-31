import {
  nativeImage,
  TouchBar as ElectronTouchBar,
  TouchBarPopover,
} from 'electron';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import * as rootWindowActions from '../../../common/actions/rootWindowActions';
import * as viewActions from '../../../common/actions/viewActions';
import { useAppDispatch } from '../../../common/hooks/useAppDispatch';
import { useAppSelector } from '../../../common/hooks/useAppSelector';
import { useInitRef } from '../../../common/hooks/useInitRef';

export const useServerSelectionPopover = (): TouchBarPopover => {
  const servers = useAppSelector((state) =>
    state.servers.map(({ url, title, favicon }) => ({
      url,
      title,
      favicon,
    }))
  );

  const dispatch = useAppDispatch();

  const { t } = useTranslation();

  const onSelectRef = useRef<(index: number) => void>();
  onSelectRef.current = (index: number) => {
    dispatch(rootWindowActions.focused());
    const { url } = servers[index];
    dispatch(viewActions.changed({ url }));
  };

  const items = useMemo(
    () =>
      servers.map((server) => ({
        label: server.title?.padEnd(30),
        icon: server.favicon
          ? nativeImage.createFromDataURL(server.favicon)
          : undefined,
      })),
    [servers]
  );

  const scrubberRef = useInitRef(
    () =>
      new ElectronTouchBar.TouchBarScrubber({
        selectedStyle: 'background',
        mode: 'free',
        continuous: false,
        items,
        select: (index) => onSelectRef.current?.call(null, index),
      })
  );

  useEffect(() => {
    scrubberRef.current.items = items;
  }, [items, scrubberRef]);

  const favicon = useAppSelector(({ servers, ui: { view } }) => {
    if (typeof view !== 'object') {
      return undefined;
    }

    return servers.find((server) => server.url === view.url)?.favicon;
  });

  const icon = useMemo(
    () =>
      favicon
        ? nativeImage.createFromDataURL(favicon)
        : nativeImage.createEmpty(),
    [favicon]
  );

  const title = useAppSelector(({ servers, ui: { view } }) => {
    if (typeof view !== 'object') {
      return undefined;
    }

    return servers.find((server) => server.url === view.url)?.title;
  });

  const label = useMemo(() => title ?? t('touchBar.selectServer'), [title, t]);

  const popoverRef = useInitRef(
    () =>
      new ElectronTouchBar.TouchBarPopover({
        icon,
        label,
        items: new ElectronTouchBar({
          items: [scrubberRef.current],
        }),
        showCloseButton: true,
      })
  );

  useEffect(() => {
    popoverRef.current.icon = icon;
    popoverRef.current.label = label;
  }, [icon, label, popoverRef, t]);

  return popoverRef.current;
};
