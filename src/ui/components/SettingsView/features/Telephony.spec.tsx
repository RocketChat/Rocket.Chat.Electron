import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_IS_TELEPHONY_ENABLED_CHANGED } from '../../../actions';
import { Telephony } from './Telephony';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

type PartialState = Pick<RootState, 'isTelephonyEnabled'>;

const makeStore = (partial: PartialState) => {
  const reducer = (state: PartialState = partial) => state;
  return createStore(reducer as any);
};

describe('Telephony', () => {
  it('renders unchecked when isTelephonyEnabled=false', () => {
    const store = makeStore({ isTelephonyEnabled: false });
    render(
      <Provider store={store}>
        <Telephony />
      </Provider>
    );
    const toggle = screen.getByRole('checkbox');
    expect(toggle).not.toBeChecked();
  });

  it('renders checked when isTelephonyEnabled=true', () => {
    const store = makeStore({ isTelephonyEnabled: true });
    render(
      <Provider store={store}>
        <Telephony />
      </Provider>
    );
    const toggle = screen.getByRole('checkbox');
    expect(toggle).toBeChecked();
  });

  it('dispatches SETTINGS_SET_IS_TELEPHONY_ENABLED_CHANGED on toggle', () => {
    const store = makeStore({ isTelephonyEnabled: false });
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <Telephony />
      </Provider>
    );
    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: SETTINGS_SET_IS_TELEPHONY_ENABLED_CHANGED,
      payload: true,
    });
  });
});
