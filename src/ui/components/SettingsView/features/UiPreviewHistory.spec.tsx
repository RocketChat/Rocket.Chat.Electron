import '@testing-library/jest-dom';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { combineReducers, createStore } from 'redux';

import { invoke } from '../../../../ipc/renderer';
import type { Server } from '../../../../servers/common';
import type { UiPreviewHistoryEntry } from '../../../common';
import { uiPreviewHistory } from '../../../reducers/uiPreviewHistory';
import { UiPreviewHistory } from './UiPreviewHistory';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) =>
      options ? `${key} ${Object.values(options).join(' ')}` : key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('../../../../ipc/renderer', () => ({
  invoke: jest.fn(),
}));

const open: Server = { url: 'https://open.rocket.chat/', title: 'Open' };
const other: Server = { url: 'https://other.example.com/', title: 'Other' };

const pr: UiPreviewHistoryEntry = {
  input: '42364',
  label: 'PR #42364',
  digest: `sha256:${'a'.repeat(64)}`,
  revision: 'eb79e9cf6173af43cd3aee956da47732539f5e4d',
  createdAt: '2026-10-05T13:12:00.000Z',
};

const renderHistory = ({
  servers = [open],
  history = [pr],
  currentView = { url: open.url },
}: {
  servers?: Server[];
  history?: UiPreviewHistoryEntry[];
  currentView?: { url: string } | 'add-new-server';
} = {}) => {
  const store = createStore(
    combineReducers({
      uiPreviewHistory,
      currentView: (state = currentView) => state,
    }),
    { uiPreviewHistory: history, currentView } as any
  );
  render(
    <Provider store={store}>
      <UiPreviewHistory servers={servers} />
    </Provider>
  );
};

const add = (value: string) => {
  fireEvent.change(
    screen.getByPlaceholderText('settings.options.uiPreview.placeholder'),
    { target: { value } }
  );
  fireEvent.click(screen.getByText('settings.options.uiPreview.add'));
};

const entryNamed = (label: string) =>
  within(screen.getByRole('group', { name: label }));

describe('UiPreviewHistory', () => {
  beforeEach(() => {
    jest.mocked(invoke).mockReset();
  });

  it('names a PR build by its state and title, in full on hover', () => {
    renderHistory({
      history: [
        {
          ...pr,
          pullRequest: { title: 'ci: publish PR UI previews', state: 'merged' },
        },
      ],
    });

    const entry = entryNamed('PR #42364');
    expect(
      entry.getByText('settings.options.uiPreview.pullRequestState.merged')
    ).toBeInTheDocument();
    expect(
      entry.getByTitle('PR #42364 · ci: publish PR UI previews')
    ).toHaveTextContent(/^ci: publish PR UI previews$/);
  });

  it('names a PR build by its number alone until GitHub describes it', () => {
    renderHistory();

    expect(entryNamed('PR #42364').queryByTitle(/^PR #42364 ·/)).toBeNull();
    expect(
      screen.getByRole('group', { name: 'PR #42364' })
    ).not.toHaveTextContent('pullRequestState');
  });

  it('asks for a build to be checked and clears the field once it is listed', async () => {
    jest.mocked(invoke).mockResolvedValue({ status: 'added' });
    renderHistory({ history: [] });

    add(' develop ');

    expect(invoke).toHaveBeenCalledWith('ui-preview/add', 'develop');
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText('settings.options.uiPreview.placeholder')
      ).toHaveValue('')
    );
  });

  it('keeps the field and says why a build could not be listed', async () => {
    jest.mocked(invoke).mockResolvedValue({
      status: 'failed',
      message: 'ghcr.io/rocketchat/rocket.chat-web:pr-1 was not found',
    });
    renderHistory({ history: [] });

    add('1');

    expect(
      await screen.findByText(
        'settings.options.uiPreview.failed ghcr.io/rocketchat/rocket.chat-web:pr-1 was not found'
      )
    ).toHaveAttribute('role', 'status');
    expect(
      screen.getByPlaceholderText('settings.options.uiPreview.placeholder')
    ).toHaveValue('1');

    fireEvent.change(
      screen.getByPlaceholderText('settings.options.uiPreview.placeholder'),
      { target: { value: '12' } }
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the commit and date of each listed build', () => {
    renderHistory();

    expect(
      entryNamed('PR #42364').getByText(
        `eb79e9c · settings.options.uiPreview.builtAt ${new Date(
          pr.createdAt as string
        ).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}`
      )
    ).toBeInTheDocument();
  });

  it('names the workspaces running a build', () => {
    renderHistory({
      servers: [{ ...open, uiPreviewSource: '42364' }, other],
    });

    expect(
      entryNamed('PR #42364').getByText(
        'settings.options.uiPreview.activeOn Open'
      )
    ).toBeInTheDocument();
  });

  it('applies a build to the workspace in view', async () => {
    jest
      .mocked(invoke)
      .mockResolvedValue({ status: 'applied', label: 'PR #42364' });
    renderHistory({ servers: [open, other], currentView: { url: other.url } });

    fireEvent.click(
      entryNamed('PR #42364').getByText('settings.options.uiPreview.apply')
    );

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith(
        'ui-preview/apply',
        other.url,
        '42364'
      )
    );
  });

  it('offers no workspace choice when there is only one', () => {
    renderHistory();

    expect(
      screen.queryByText('settings.options.uiPreview.applyTo')
    ).not.toBeInTheDocument();
  });

  it('says when a refresh found nothing newer', async () => {
    jest.mocked(invoke).mockResolvedValue({ status: 'current' });
    renderHistory();

    fireEvent.click(
      entryNamed('PR #42364').getByRole('button', {
        name: 'settings.options.uiPreview.refresh',
      })
    );

    expect(
      await entryNamed('PR #42364').findByText(
        'settings.options.uiPreview.current'
      )
    ).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith('ui-preview/refresh', '42364');
  });

  it('reports a refresh that failed', async () => {
    jest.mocked(invoke).mockRejectedValue(new Error('ghcr.io responded 503'));
    renderHistory();

    fireEvent.click(
      entryNamed('PR #42364').getByRole('button', {
        name: 'settings.options.uiPreview.refresh',
      })
    );

    expect(
      await entryNamed('PR #42364').findByText(
        'settings.options.uiPreview.failed ghcr.io responded 503'
      )
    ).toHaveAttribute('role', 'status');
  });

  it('removes a build from the list', () => {
    renderHistory();

    fireEvent.click(
      entryNamed('PR #42364').getByRole('button', {
        name: 'settings.options.uiPreview.remove',
      })
    );

    expect(
      screen.queryByRole('group', { name: 'PR #42364' })
    ).not.toBeInTheDocument();
  });
});
