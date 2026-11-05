import type { ChangeEvent } from 'react';
import { useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { Dispatch } from 'redux';

import type { RootAction } from '../../../../store/actions';
import type { RootState } from '../../../../store/rootReducer';
import { SETTINGS_SET_ANIMATED_IMAGES_CHANGED } from '../../../actions';
import { ToggleField } from './ToggleField';

type AnimatedImagesProps = {
  className?: string;
};

export const AnimatedImages = (props: AnimatedImagesProps) => {
  const isAnimatedImagesEnabled = useSelector(
    ({ isAnimatedImagesEnabled }: RootState) => isAnimatedImagesEnabled
  );
  const dispatch = useDispatch<Dispatch<RootAction>>();
  const { t } = useTranslation();
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.currentTarget.checked;
      dispatch({
        type: SETTINGS_SET_ANIMATED_IMAGES_CHANGED,
        payload: isChecked,
      });
    },
    [dispatch]
  );

  const isAnimatedImagesEnabledId = useId();

  return (
    <ToggleField
      id={isAnimatedImagesEnabledId}
      label={t('settings.options.animatedImages.title')}
      description={t('settings.options.animatedImages.description')}
      hint={t('settings.options.animatedImages.hint')}
      checked={isAnimatedImagesEnabled}
      onChange={handleChange}
      className={props.className}
    />
  );
};
