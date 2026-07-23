import { IconButton } from '@rocket.chat/fuselage';
import type { MouseEvent } from 'react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { dispatch } from '../../../store';
import { APP_MENU_TRIGGERED } from '../../actions';
import { TabBarButtonWrapper } from './styles';

export const MeatballMenuButton = () => {
  const { t } = useTranslation();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const openMenu = (element: HTMLElement): void => {
    const rect = element.getBoundingClientRect();
    dispatch({
      type: APP_MENU_TRIGGERED,
      payload: { x: Math.round(rect.left), y: Math.round(rect.bottom) },
    });
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    openMenu(event.currentTarget);
  };

  useEffect(() => {
    let isSoloAltPress = false;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Alt') {
        isSoloAltPress = !event.repeat;
        return;
      }
      isSoloAltPress = false;
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
      if (event.key === 'Alt' && isSoloAltPress && buttonRef.current) {
        openMenu(buttonRef.current);
      }
      isSoloAltPress = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <TabBarButtonWrapper>
      <IconButton
        medium
        ref={buttonRef}
        icon='kebab'
        aria-haspopup='menu'
        aria-label={t('tabBar.meatballMenu')}
        title={t('tabBar.meatballMenu')}
        onClick={handleClick}
      />
    </TabBarButtonWrapper>
  );
};

export default MeatballMenuButton;
