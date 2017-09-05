import React from 'react';
import { render } from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import { app } from 'electron';
import Root from './containers/Root';
import { configureStore, history } from './store/configureStore';
import './app.global.scss';

const store = configureStore();

/*if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
  const userDataPath = app.getPath('userData');
  app.setPath('userData', `${userDataPath} (${process.env.NODE_ENV})`);
  console.log(userDataPath)
  console.log('get path to ')
  console.log(app.getPath('userData'))
}*/

render(
  <AppContainer>
    <Root store={store} history={history} />
  </AppContainer>,
  document.getElementById('root')
);

if (module.hot) {
  module.hot.accept('./containers/Root', () => {
    const NextRoot = require('./containers/Root'); // eslint-disable-line global-require
    render(
      <AppContainer>
        <NextRoot store={store} history={history} />
      </AppContainer>,
      document.getElementById('root')
    );
  });
}
