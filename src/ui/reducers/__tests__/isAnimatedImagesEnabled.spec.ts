import { APP_SETTINGS_LOADED } from '../../../app/actions';
import { selectPersistableValues } from '../../../app/selectors';
import { rootReducer } from '../../../store/rootReducer';
import { SETTINGS_SET_ANIMATED_IMAGES_CHANGED } from '../../actions';

it('preserves autoplay by default and restores a disabled preference after restart', () => {
  const initial = rootReducer(undefined, { type: 'unknown' } as never);
  expect(initial.isAnimatedImagesEnabled).toBe(true);
  const disabled = rootReducer(initial, {
    type: SETTINGS_SET_ANIMATED_IMAGES_CHANGED,
    payload: false,
  });
  const persisted = selectPersistableValues(disabled);
  expect(persisted.isAnimatedImagesEnabled).toBe(false);
  const restarted = rootReducer(initial, {
    type: APP_SETTINGS_LOADED,
    payload: persisted,
  });
  expect(restarted.isAnimatedImagesEnabled).toBe(false);
  expect(
    rootReducer(restarted, {
      type: SETTINGS_SET_ANIMATED_IMAGES_CHANGED,
      payload: true,
    }).isAnimatedImagesEnabled
  ).toBe(true);
});

it('keeps autoplay enabled when upgrading a profile without the new preference', () => {
  expect(
    rootReducer(undefined, {
      type: APP_SETTINGS_LOADED,
      payload: {},
    } as never).isAnimatedImagesEnabled
  ).toBe(true);
});
