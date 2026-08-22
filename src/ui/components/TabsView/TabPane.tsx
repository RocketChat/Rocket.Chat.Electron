import { Box } from '@rocket.chat/fuselage';
import { useDispatch, useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';
import { ACTIVE_TAB, CLOSE_TAB } from '../../actions';
import { Tab } from './Tab';

export const TabPane = () => {
  const dispatch = useDispatch();
  const tabs = useSelector((state: RootState) => state.tabs.tabs);
  const activeUrl = useSelector((state: RootState) => state.tabs.activeTabUrl);

  const handleTabClick = (url: string): void => {
    dispatch({ type: ACTIVE_TAB, payload: { url } });
  };

  const handleClose = (url: string): void => {
    dispatch({ type: CLOSE_TAB, payload: { url } });
  };

  return (
    <Box
      display='flex'
      flexDirection='row'
      alignItems='stretch'
      overflowX='auto'
      overflowY='hidden'
      bg='surface-light'
      borderBlockEndWidth='x1'
      borderBlockEndStyle='solid'
      borderBlockEndColor='extra-light'
      style={{ flexShrink: 0 }}
    >
      {tabs.map((tab) => (
        <Tab
          key={tab.url}
          channelName={tab.text}
          isActive={tab.url === activeUrl}
          onClick={() => handleTabClick(tab.url)}
          onClose={() => handleClose(tab.url)}
        />
      ))}
    </Box>
  );
};
