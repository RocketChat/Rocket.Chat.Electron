import { useState, DragEvent } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';

import { Server } from '../../../servers/common';
import { RootAction } from '../../../store/actions';
import {
  SIDE_BAR_SERVERS_SORTED,
  SIDE_BAR_SERVER_SELECTED,
} from '../../actions';

export const useSorting = <S extends Server>(
  servers: S[]
): {
  sortedServers: S[];
  draggedServerUrl: string | null;
  handleDragStart: (url: string) => (event: DragEvent) => void;
  handleDragEnd: (event: DragEvent) => void;
  handleDragEnter: (url: string) => (event: DragEvent) => void;
  handleDrop: (url: string) => (event: DragEvent) => void;
} => {
  const [draggedServerUrl, setDraggedServerUrl] = useState<string | null>(null);
  const [serversSorting, setServersSorting] = useState<string[] | null>(null);

  const handleDragStart = (url: string) => (event: DragEvent) => {
    event.dataTransfer.dropEffect = 'move';
    event.dataTransfer.effectAllowed = 'move';
    setDraggedServerUrl(url);
  };

  const handleDragEnd = (): void => {
    setDraggedServerUrl(null);
    setServersSorting(null);
  };

  const handleDragEnter = (targetServerUrl: string) => (event: DragEvent) => {
    if (event.dataTransfer.types.length > 0) {
      event.preventDefault();
      return;
    }

    setServersSorting((serversSorting) => {
      if (serversSorting === null || draggedServerUrl == null) {
        return servers.map(({ url }) => url);
      }

      return serversSorting.map((url) => {
        if (url === targetServerUrl) {
          return draggedServerUrl;
        }

        if (url === draggedServerUrl) {
          return targetServerUrl;
        }

        return url;
      });
    });
  };

  const dispatch = useDispatch<Dispatch<RootAction>>();

  const handleDrop = (url: string) => (event: DragEvent) => {
    event.preventDefault();

    if (event.dataTransfer.types.length === 0) {
      if (serversSorting) {
        dispatch({ type: SIDE_BAR_SERVERS_SORTED, payload: serversSorting });
      }
      dispatch({ type: SIDE_BAR_SERVER_SELECTED, payload: url });
    }
  };

  const sortedServers = serversSorting
    ? servers.sort(
        ({ url: a }, { url: b }) =>
          serversSorting.indexOf(a) - serversSorting.indexOf(b)
      )
    : servers;

  return {
    sortedServers,
    draggedServerUrl,
    handleDragStart,
    handleDragEnd,
    handleDragEnter,
    handleDrop,
  };
};
