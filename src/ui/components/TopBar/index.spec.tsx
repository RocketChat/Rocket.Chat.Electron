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

  it('omits the tint background on darwin when transparent window is enabled', () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true,
    });

    try {
      renderTopBar({
        mainWindowTitle: 'Title',
        isTransparentWindowEnabled: true,
      });
      const title = screen.getByText('Title');
      const sidebar = title.closest('.rcx-sidebar--main') as HTMLElement;
      expect(getComputedStyle(sidebar).backgroundColor).toBe(
        'rgba(0, 0, 0, 0)'
      );
    } finally {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true,
      });
    }
  });
});
