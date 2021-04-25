import React, { FC } from 'react';

import AppIcon from '../icons/AppIcon';

const NsisSideBar: FC = () => {
  const backgroundColor = '#F7F8FA';

  return (
    <svg viewBox='0 0 164 314' xmlns='http://www.w3.org/2000/svg'>
      <rect width='164' height='314' fill={backgroundColor} />
      <svg x='18' y='18' width='128' height='128'>
        <AppIcon />
      </svg>
    </svg>
  );
};

export default NsisSideBar;
