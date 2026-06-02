import { DEEP_LINKS_SERVER_FOCUSED } from '../../deepLinks/actions';
import { dispatch, listen, select } from '../../store';
import {
  TELEPHONY_SERVER_SELECT_CLOSE,
  TELEPHONY_SERVER_SELECT_OPEN,
} from '../../ui/actions';
import { getWebContentsByServerUrl } from '../../ui/main/serverView';
import { TELEPHONY_PREFERRED_SERVER_SET } from '../actions';
import type { TelephonyLink } from '../common';
import { openTelephonyDialpad } from '../dialpad';

jest.mock('../../store', () => ({
  dispatch: jest.fn(),
  listen: jest.fn(),
  select: jest.fn(),
}));

jest.mock('../../ui/main/serverView', () => ({
  getWebContentsByServerUrl: jest.fn(),
}));

const dispatchMock = dispatch as jest.MockedFunction<typeof dispatch>;
const listenMock = listen as jest.MockedFunction<typeof listen>;
const selectMock = select as jest.MockedFunction<typeof select>;
const getWebContentsByServerUrlMock =
  getWebContentsByServerUrl as jest.MockedFunction<
    typeof getWebContentsByServerUrl
  >;

const link: TelephonyLink = {
  phoneNumber: '+15551234567',
  rawUri: 'tel:+15551234567',
};

const mockState = (state: {
  servers: { url: string }[];
  telephonyPreferredServer?: string | null;
}) => {
  selectMock.mockImplementation((selector: any) =>
    selector({
      servers: state.servers,
      telephonyPreferredServer: state.telephonyPreferredServer ?? null,
    })
  );
};

const stubWebContents = () => {
  const send = jest.fn();
  getWebContentsByServerUrlMock.mockReturnValue({ send } as any);
  return { send };
};

const findDispatchCall = (type: string) =>
  dispatchMock.mock.calls.find(
    ([action]) => (action as any).type === type
  )?.[0];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('openTelephonyDialpad', () => {
  it('does nothing and does not focus a view when there are no servers', async () => {
    mockState({ servers: [] });

    await openTelephonyDialpad(link);

    expect(findDispatchCall(DEEP_LINKS_SERVER_FOCUSED)).toBeUndefined();
    expect(getWebContentsByServerUrlMock).not.toHaveBeenCalled();
  });

  it('focuses the single server and forwards the call when only one exists', async () => {
    const url = 'https://only.example.com';
    mockState({ servers: [{ url }] });
    const { send } = stubWebContents();

    await openTelephonyDialpad(link);

    expect(findDispatchCall(DEEP_LINKS_SERVER_FOCUSED)).toEqual({
      type: DEEP_LINKS_SERVER_FOCUSED,
      payload: url,
    });
    expect(send).toHaveBeenCalledWith('telephony/call-requested', {
      phoneNumber: link.phoneNumber,
      rawUri: link.rawUri,
    });
  });

  it('focuses the preferred server without opening the modal', async () => {
    const preferred = 'https://b.example.com';
    mockState({
      servers: [{ url: 'https://a.example.com' }, { url: preferred }],
      telephonyPreferredServer: preferred,
    });
    const { send } = stubWebContents();

    await openTelephonyDialpad(link);

    expect(findDispatchCall(DEEP_LINKS_SERVER_FOCUSED)).toEqual({
      type: DEEP_LINKS_SERVER_FOCUSED,
      payload: preferred,
    });
    expect(
      dispatchMock.mock.calls.some(
        ([action]) => (action as any).type === TELEPHONY_SERVER_SELECT_OPEN
      )
    ).toBe(false);
    expect(send).toHaveBeenCalled();
  });

  it('opens the modal and focuses the picked server after selection', async () => {
    const picked = 'https://picked.example.com';
    mockState({
      servers: [{ url: 'https://a.example.com' }, { url: picked }],
      telephonyPreferredServer: null,
    });
    const { send } = stubWebContents();

    let resolveSelection: ((payload: any) => void) | undefined;
    listenMock.mockImplementation((type: any, cb: any) => {
      if (type === TELEPHONY_SERVER_SELECT_CLOSE) {
        resolveSelection = (payload: any) =>
          cb({ type: TELEPHONY_SERVER_SELECT_CLOSE, payload });
      }
      return jest.fn();
    });

    const pending = openTelephonyDialpad(link);

    expect(resolveSelection).toBeDefined();
    resolveSelection!({ serverUrl: picked, rememberChoice: false });

    await pending;

    expect(findDispatchCall(TELEPHONY_SERVER_SELECT_OPEN)).toBeDefined();
    expect(findDispatchCall(DEEP_LINKS_SERVER_FOCUSED)).toEqual({
      type: DEEP_LINKS_SERVER_FOCUSED,
      payload: picked,
    });
    expect(
      dispatchMock.mock.calls.some(
        ([action]) => (action as any).type === TELEPHONY_PREFERRED_SERVER_SET
      )
    ).toBe(false);
    expect(send).toHaveBeenCalled();
  });

  it('persists the preferred server when the user opted to remember', async () => {
    const picked = 'https://remember.example.com';
    mockState({
      servers: [{ url: 'https://a.example.com' }, { url: picked }],
      telephonyPreferredServer: null,
    });
    stubWebContents();

    let resolveSelection: ((payload: any) => void) | undefined;
    listenMock.mockImplementation((type: any, cb: any) => {
      if (type === TELEPHONY_SERVER_SELECT_CLOSE) {
        resolveSelection = (payload: any) =>
          cb({ type: TELEPHONY_SERVER_SELECT_CLOSE, payload });
      }
      return jest.fn();
    });

    const pending = openTelephonyDialpad(link);
    resolveSelection!({ serverUrl: picked, rememberChoice: true });
    await pending;

    expect(findDispatchCall(TELEPHONY_PREFERRED_SERVER_SET)).toEqual({
      type: TELEPHONY_PREFERRED_SERVER_SET,
      payload: picked,
    });
    expect(findDispatchCall(DEEP_LINKS_SERVER_FOCUSED)).toEqual({
      type: DEEP_LINKS_SERVER_FOCUSED,
      payload: picked,
    });
  });

  it('does not focus a view when the modal is cancelled', async () => {
    mockState({
      servers: [
        { url: 'https://a.example.com' },
        { url: 'https://b.example.com' },
      ],
      telephonyPreferredServer: null,
    });
    stubWebContents();

    let resolveSelection: ((payload: any) => void) | undefined;
    listenMock.mockImplementation((type: any, cb: any) => {
      if (type === TELEPHONY_SERVER_SELECT_CLOSE) {
        resolveSelection = (payload: any) =>
          cb({ type: TELEPHONY_SERVER_SELECT_CLOSE, payload });
      }
      return jest.fn();
    });

    const pending = openTelephonyDialpad(link);
    resolveSelection!(null);
    await pending;

    expect(findDispatchCall(DEEP_LINKS_SERVER_FOCUSED)).toBeUndefined();
  });
});
