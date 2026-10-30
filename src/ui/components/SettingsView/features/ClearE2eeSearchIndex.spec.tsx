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

  const confirmKey = 'settings.options.clearE2eeSearchIndex.confirm';

  const openConfirm = () => {
    render(<ClearE2eeSearchIndex />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'settings.options.clearE2eeSearchIndex.title',
      })
    );
  };

  // A rebuild of a large history takes long, so the clear asks first.
  it('asks for a confirmation and clears nothing on the first click', () => {
    openConfirm();

    expect(screen.getByText(`${confirmKey}.title`)).toBeInTheDocument();
    expect(screen.getByText(`${confirmKey}.message`)).toBeInTheDocument();
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('clears the index when the user confirms', () => {
    openConfirm();
    fireEvent.click(
      screen.getByRole('button', { name: `${confirmKey}.confirm` })
    );

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith({
      type: SETTINGS_CLEAR_E2EE_SEARCH_INDEX_CLICKED,
    });
    expect(screen.queryByText(`${confirmKey}.title`)).toBeNull();
  });

  it('clears nothing when the user cancels', () => {
    openConfirm();
    fireEvent.click(
      screen.getByRole('button', { name: `${confirmKey}.cancel` })
    );

    expect(dispatchMock).not.toHaveBeenCalled();
    expect(screen.queryByText(`${confirmKey}.title`)).toBeNull();
  });

  it('clears nothing when the user presses Escape', () => {
    openConfirm();
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(dispatchMock).not.toHaveBeenCalled();
    expect(screen.queryByText(`${confirmKey}.title`)).toBeNull();
  });
});
