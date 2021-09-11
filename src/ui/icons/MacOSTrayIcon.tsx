import React, { FC } from 'react';

import AppIcon from './AppIcon';
import Badge from './Badge';

type MacOSTrayIconProps = {
  notification?: boolean;
};

const MacOSTrayIcon: FC<MacOSTrayIconProps> = ({ notification }) => (
  <svg
    width='100%'
    viewBox='0 0 512 512'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <g transform='translate(256, 256) scale(0.8) translate(-256, -256)'>
      <AppIcon color='black'>
        {notification && <Badge value={0} backgroundColor='black' />}
      </AppIcon>
    </g>
  </svg>
);

export default MacOSTrayIcon;
