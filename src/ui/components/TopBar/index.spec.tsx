import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import { TopBar } from './index';

const renderTopBar = (state: any) => {
  const store = createStore(() => state);
  return render(
    <Provider store={store}>
      <TopBar />
    </Provider>
  );
};

describe('TopBar', () => {
  it('renders main window title', () => {
    renderTopBar({
      mainWindowTitle: 'Rocket.Chat Desktop',
      isTransparentWindowEnabled: false,
    });
    expect(screen.getByText('Rocket.Chat Desktop')).toBeInTheDocument();
  });

  it('renders with transparent window enabled', () => {
    renderTopBar({
      mainWindowTitle: 'Title',
      isTransparentWindowEnabled: true,
    });
    expect(screen.getByText('Title')).toBeInTheDocument();
  });
});
