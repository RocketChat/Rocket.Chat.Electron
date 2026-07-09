import { useSelector } from 'react-redux';

import type { RootState } from '../../../store/rootReducer';
import { TabWebView } from '../TabsView/TabWebView';

export const TabContentView = () => {
  const tabs = useSelector((state: RootState) => state.tabs.tabs);
  const activeTabUrl = useSelector(
    (state: RootState) => state.tabs.activeTabUrl
  );

  return (
    <>
      {tabs.map((tab) => (
        <TabWebView
          key={tab.url}
          url={tab.url}
          serverUrl={tab.serverUrl}
          isActive={tab.url === activeTabUrl}
        />
      ))}
    </>
  );
};
