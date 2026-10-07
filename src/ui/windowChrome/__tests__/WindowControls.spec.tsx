import { render, screen } from '@testing-library/react';

import { WindowControls } from '../WindowControls';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('electron', () => ({
  ipcRenderer: { on: jest.fn(), off: jest.fn() },
}));

jest.mock('../../../ipc/renderer', () => ({
  invoke: jest.fn().mockResolvedValue(false),
}));

describe('secondary WindowControls', () => {
  it('shows minimize, maximize and close by default', () => {
    render(<WindowControls />);

    expect(
      screen.getByRole('button', { name: 'tabBar.windowControls.minimize' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'tabBar.windowControls.maximize' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'tabBar.windowControls.close' })
    ).toBeInTheDocument();
  });

  it('drops the maximize button for a fixed-size window', () => {
    render(<WindowControls isMaximizable={false} />);

    expect(
      screen.queryByRole('button', { name: 'tabBar.windowControls.maximize' })
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });
});
