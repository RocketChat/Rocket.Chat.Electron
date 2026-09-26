import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { invoke } from '../../../../ipc/renderer';
import { UiPreviewRow } from './UiPreviewRow';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) =>
      options ? `${key} ${Object.values(options).join(' ')}` : key,
  }),
}));

jest.mock('../../../../ipc/renderer', () => ({
  invoke: jest.fn(),
}));

const server = { url: 'https://open.rocket.chat/', title: 'Open' };

const renderRow = (uiPreview?: string) =>
  render(<UiPreviewRow server={{ ...server, uiPreview }} />);

const load = (value: string) => {
  fireEvent.change(
    screen.getByPlaceholderText('settings.options.uiPreview.placeholder'),
    { target: { value } }
  );
  fireEvent.click(screen.getByText('settings.options.uiPreview.load'));
};

describe('UiPreviewRow', () => {
  beforeEach(() => {
    jest.mocked(invoke).mockReset();
  });

  it('reports why a preview could not be loaded', async () => {
    jest
      .mocked(invoke)
      .mockResolvedValue({ status: 'failed', message: 'responded 403' });
    renderRow();

    load('42364');

    expect(await screen.findByRole('status')).toHaveTextContent(
      'settings.options.uiPreview.failed responded 403'
    );
    expect(invoke).toHaveBeenCalledWith(
      'ui-preview/apply',
      server.url,
      '42364'
    );
  });

  it('shows the active preview and lets it be restored', async () => {
    jest.mocked(invoke).mockResolvedValue(undefined);
    renderRow('PR #42364');

    expect(screen.getByRole('status')).toHaveTextContent(
      'settings.options.uiPreview.active PR #42364'
    );

    fireEvent.click(screen.getByText('settings.options.uiPreview.restore'));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith('ui-preview/restore', server.url)
    );
  });

  it('says the server UI is in use when nothing is loaded', () => {
    renderRow();

    expect(screen.getByRole('status')).toHaveTextContent(
      'settings.options.uiPreview.inactive'
    );
  });
});
