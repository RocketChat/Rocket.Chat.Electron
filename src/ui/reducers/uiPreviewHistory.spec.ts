import { APP_SETTINGS_LOADED } from '../../app/actions';
import {
  UI_PREVIEW_HISTORY_ENTRY_ADDED,
  UI_PREVIEW_HISTORY_ENTRY_REMOVED,
  UI_PREVIEW_HISTORY_ENTRY_UPDATED,
} from '../actions';
import type { UiPreviewHistoryEntry } from '../common';
import { uiPreviewHistory } from './uiPreviewHistory';

const entry = (input: string, digest?: string): UiPreviewHistoryEntry => ({
  input,
  label: input === 'develop' ? 'develop' : `PR #${input}`,
  digest,
});

describe('uiPreviewHistory reducer', () => {
  it('starts empty', () => {
    expect(
      uiPreviewHistory(undefined, { type: 'UNKNOWN_ACTION' } as any)
    ).toEqual([]);
  });

  describe('UI_PREVIEW_HISTORY_ENTRY_ADDED', () => {
    it('lists the newest addition first', () => {
      expect(
        uiPreviewHistory([entry('develop')], {
          type: UI_PREVIEW_HISTORY_ENTRY_ADDED,
          payload: entry('42364'),
        })
      ).toEqual([entry('42364'), entry('develop')]);
    });

    it('moves a source added again to the top instead of listing it twice', () => {
      expect(
        uiPreviewHistory([entry('develop'), entry('42364', 'sha256:a')], {
          type: UI_PREVIEW_HISTORY_ENTRY_ADDED,
          payload: entry('42364', 'sha256:b'),
        })
      ).toEqual([entry('42364', 'sha256:b'), entry('develop')]);
    });

    it('keeps the listed PR when a source added again carries none', () => {
      const pullRequest = { title: 'A title', state: 'open' as const };

      expect(
        uiPreviewHistory(
          [entry('develop'), { ...entry('42364'), pullRequest }],
          {
            type: UI_PREVIEW_HISTORY_ENTRY_ADDED,
            payload: entry('42364', 'sha256:b'),
          }
        )
      ).toEqual([
        { ...entry('42364', 'sha256:b'), pullRequest },
        entry('develop'),
      ]);
    });

    it('drops the entry added longest ago past twenty', () => {
      const listed = Array.from({ length: 20 }, (_, index) =>
        entry(String(index + 1))
      );

      const state = uiPreviewHistory(listed, {
        type: UI_PREVIEW_HISTORY_ENTRY_ADDED,
        payload: entry('develop'),
      });

      expect(state).toHaveLength(20);
      expect(state[0]).toEqual(entry('develop'));
      expect(state).not.toContainEqual(entry('20'));
    });
  });

  describe('UI_PREVIEW_HISTORY_ENTRY_UPDATED', () => {
    it('updates a listed entry where it is', () => {
      expect(
        uiPreviewHistory([entry('develop'), entry('42364', 'sha256:a')], {
          type: UI_PREVIEW_HISTORY_ENTRY_UPDATED,
          payload: entry('42364', 'sha256:b'),
        })
      ).toEqual([entry('develop'), entry('42364', 'sha256:b')]);
    });

    it('keeps the listed PR when the update carries none', () => {
      const pullRequest = { title: 'A title', state: 'open' as const };

      expect(
        uiPreviewHistory([{ ...entry('42364', 'sha256:a'), pullRequest }], {
          type: UI_PREVIEW_HISTORY_ENTRY_UPDATED,
          payload: entry('42364', 'sha256:b'),
        })
      ).toEqual([{ ...entry('42364', 'sha256:b'), pullRequest }]);
    });

    it('replaces the listed PR with a newer reading', () => {
      const merged = { title: 'New', state: 'merged' as const };

      expect(
        uiPreviewHistory(
          [{ ...entry('42364'), pullRequest: { title: 'Old', state: 'open' } }],
          {
            type: UI_PREVIEW_HISTORY_ENTRY_UPDATED,
            payload: { ...entry('42364'), pullRequest: merged },
          }
        )
      ).toEqual([{ ...entry('42364'), pullRequest: merged }]);
    });

    it('never lists a build that is not listed', () => {
      expect(
        uiPreviewHistory([entry('develop')], {
          type: UI_PREVIEW_HISTORY_ENTRY_UPDATED,
          payload: entry('42364'),
        })
      ).toEqual([entry('develop')]);
    });
  });

  describe('UI_PREVIEW_HISTORY_ENTRY_REMOVED', () => {
    it('removes the entry for that input', () => {
      expect(
        uiPreviewHistory([entry('develop'), entry('42364')], {
          type: UI_PREVIEW_HISTORY_ENTRY_REMOVED,
          payload: '42364',
        })
      ).toEqual([entry('develop')]);
    });
  });

  describe('APP_SETTINGS_LOADED', () => {
    it('restores the saved list', () => {
      expect(
        uiPreviewHistory([], {
          type: APP_SETTINGS_LOADED,
          payload: { uiPreviewHistory: [entry('42364')] },
        })
      ).toEqual([entry('42364')]);
    });

    it('keeps the current list when the config has none', () => {
      expect(
        uiPreviewHistory([entry('develop')], {
          type: APP_SETTINGS_LOADED,
          payload: {},
        })
      ).toEqual([entry('develop')]);
    });
  });
});
