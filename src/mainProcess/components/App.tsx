import type { BrowserWindow } from 'electron';
import React, { ReactElement, useEffect, useState } from 'react';

import { useAppSelector } from '../../common/hooks/useAppSelector';
import { getRootWindow } from '../rootWindow';
import Dock from './Dock';
import MenuBar from './MenuBar';

const App = (): ReactElement => {
  const platform = useAppSelector((state) => state.app.platform);
  const [rootWindow, setRootWindow] = useState<BrowserWindow>();

  useEffect(() => {
    getRootWindow().then(setRootWindow);
  }, []);

  return (
    <>
      {rootWindow && <MenuBar rootWindow={rootWindow} />}
      {platform === 'darwin' && <Dock />}
    </>
  );
};

export default App;
