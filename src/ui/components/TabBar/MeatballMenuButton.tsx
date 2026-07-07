import { Icon } from '@rocket.chat/fuselage';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { dispatch } from '../../../store';
import { APP_MENU_TRIGGERED } from '../../actions';
import { MeatballButton } from './styles';

export const MeatballMenuButton = () => {
  const { t } = useTranslation();

  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    dispatch({
      type: APP_MENU_TRIGGERED,
      payload: { x: Math.round(rect.left), y: Math.round(rect.bottom) },
    });
  };

  return (
    <MeatballButton
      type='button'
      aria-haspopup='menu'
      aria-label={t('tabBar.meatballMenu')}
      title={t('tabBar.meatballMenu')}
      onClick={handleClick}
    >
      <Icon name='kebab' size='x20' />
    </MeatballButton>
  );
};

export default MeatballMenuButton;
