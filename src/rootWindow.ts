import { rootSaga } from './rootWindow/rootSaga';
import { createRendererReduxStore } from './store';

const start = async (): Promise<void> => {
  await createRendererReduxStore(rootSaga);
};

start();
