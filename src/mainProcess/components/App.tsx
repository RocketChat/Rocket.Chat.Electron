import React, { ReactElement } from 'react';

import { useAppSelector } from '../../common/hooks/useAppSelector';
import Dock from './Dock';

const App = (): ReactElement => {
  const platform = useAppSelector((state) => state.app.platform);

  return <>{platform === 'darwin' && <Dock />}</>;
};

export default App;
