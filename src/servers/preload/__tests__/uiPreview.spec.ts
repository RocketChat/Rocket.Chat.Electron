import { safeSelect } from '../../../store';
import { isUiPreviewActive } from '../uiPreview';
import { getServerUrl } from '../urls';

jest.mock('../../../store', () => ({
  safeSelect: jest.fn(),
}));

jest.mock('../urls', () => ({
  getServerUrl: jest.fn(),
}));

const givenState = (state: unknown) =>
  (safeSelect as jest.Mock).mockImplementation(
    (selector: (value: unknown) => unknown) => selector(state)
  );

describe('isUiPreviewActive', () => {
  beforeEach(() => {
    (getServerUrl as jest.Mock).mockReturnValue('https://open.rocket.chat/');
  });

  it('is true when this server runs a UI preview', () => {
    givenState({
      servers: [
        { url: 'https://other.rocket.chat/' },
        { url: 'https://open.rocket.chat/', uiPreview: 'pr-42601 (abc1234)' },
      ],
    });

    expect(isUiPreviewActive()).toBe(true);
  });

  it('is false when only another server runs a UI preview', () => {
    givenState({
      servers: [
        { url: 'https://other.rocket.chat/', uiPreview: 'develop' },
        { url: 'https://open.rocket.chat/' },
      ],
    });

    expect(isUiPreviewActive()).toBe(false);
  });

  it('is false when this server is not in the store', () => {
    givenState({ servers: [] });

    expect(isUiPreviewActive()).toBe(false);
  });

  it('is false before the store is ready', () => {
    (safeSelect as jest.Mock).mockReturnValue(undefined);

    expect(isUiPreviewActive()).toBe(false);
  });
});
