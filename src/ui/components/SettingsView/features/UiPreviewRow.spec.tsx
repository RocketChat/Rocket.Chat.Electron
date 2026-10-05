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

describe('UiPreviewRow', () => {
  beforeEach(() => {
    jest.mocked(invoke).mockReset();
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

  it('reports a rejected restore and lets it be retried', async () => {
    jest.mocked(invoke).mockRejectedValue(new Error('clearCache failed'));
    renderRow('PR #42364');

    fireEvent.click(screen.getByText('settings.options.uiPreview.restore'));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'settings.options.uiPreview.failed clearCache failed'
    );
    expect(
      screen.getByText('settings.options.uiPreview.restore').closest('button')
    ).toBeEnabled();
  });

  it('says the server UI is in use when nothing is loaded', () => {
    renderRow();

    expect(screen.getByRole('status')).toHaveTextContent(
      'settings.options.uiPreview.inactive'
    );
    expect(
      screen.getByText('settings.options.uiPreview.restore').closest('button')
    ).toBeDisabled();
  });
});
