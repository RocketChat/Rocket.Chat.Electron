import React, { FC } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';

import { RootAction } from '../../../store/actions';
import { LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED } from '../../actions';
import ErrorView from './ErrorView';
import { Wrapper } from './styles';

type ServerPaneProps = {
  serverUrl: string;
  selected: boolean;
  failed: boolean;
};

export const ServerPane: FC<ServerPaneProps> = ({
  serverUrl,
  selected,
  failed,
}) => {
  const dispatch = useDispatch<Dispatch<RootAction>>();

  const handleReload = (): void => {
    dispatch({
      type: LOADING_ERROR_VIEW_RELOAD_SERVER_CLICKED,
      payload: { url: serverUrl },
    });
  };

  return <Wrapper isVisible={selected}>
    <ErrorView isFailed={failed} onReload={handleReload} />
  </Wrapper>;
};
