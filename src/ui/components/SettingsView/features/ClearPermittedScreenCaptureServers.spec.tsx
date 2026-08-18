import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

import { SETTINGS_CLEAR_PERMITTED_SCREEN_CAPTURE_PERMISSIONS } from '../../../actions';
import { ClearPermittedScreenCaptureServers } from './ClearPermittedScreenCaptureServers';

const dispatchMock = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../../../store', () => ({
  dispatch: (...args: unknown[]) => dispatchMock(...args),
}));

describe('ClearPermittedScreenCaptureServers', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
  });

  it('renders the clear action button', () => {
    render(<ClearPermittedScreenCaptureServers />);
    expect(
      screen.getByRole('button', {
        name: 'settings.options.clearPermittedScreenCaptureServers.title',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'settings.options.clearPermittedScreenCaptureServers.description'
      )
    ).toBeInTheDocument();
  });

  it('dispatches clear permissions action on click', () => {
    render(<ClearPermittedScreenCaptureServers />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'settings.options.clearPermittedScreenCaptureServers.title',
      })
    );

    expect(dispatchMock).toHaveBeenCalledWith({
      type: SETTINGS_CLEAR_PERMITTED_SCREEN_CAPTURE_PERMISSIONS,
    });
  });
});
