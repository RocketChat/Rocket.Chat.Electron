import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

import { SETTINGS_CLEAR_E2EE_SEARCH_INDEX_CLICKED } from '../../../actions';
import { ClearE2eeSearchIndex } from './ClearE2eeSearchIndex';

const dispatchMock = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../../../../store', () => ({
  dispatch: (...args: unknown[]) => dispatchMock(...args),
}));

describe('ClearE2eeSearchIndex', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
  });

  it('renders the clear action button', () => {
    render(<ClearE2eeSearchIndex />);
    expect(
      screen.getByRole('button', {
        name: 'settings.options.clearE2eeSearchIndex.title',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText('settings.options.clearE2eeSearchIndex.description')
    ).toBeInTheDocument();
  });

  it('dispatches clear index action on click', () => {
    render(<ClearE2eeSearchIndex />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'settings.options.clearE2eeSearchIndex.title',
      })
    );

    expect(dispatchMock).toHaveBeenCalledWith({
      type: SETTINGS_CLEAR_E2EE_SEARCH_INDEX_CLICKED,
    });
  });
});
