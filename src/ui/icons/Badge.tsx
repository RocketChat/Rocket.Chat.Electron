import React, { FC } from 'react';

import { Server } from '../../servers/common';

type BadgeProps = {
  value: Server['badge'];
  backgroundColor?: string;
};

const Badge: FC<BadgeProps> = ({ value, backgroundColor = '#F5455C' }) => {
  const color = '#FFFFFF';

  return (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='36 33 23 23'>
      <g fill={backgroundColor}>
        <path d='M47.5 56C41.14872538 56 36 50.8512746 36 44.5 36 38.14872538 41.14872538 33 47.5 33 53.8512746 33 59 38.14872538 59 44.5 59 50.8512746 53.8512746 56 47.5 56z' />
      </g>
      <g fill={color}>
        {(value === '•' && <circle cx='47.5' cy='44.5' r='3.5' />) ||
          (value === 1 && (
            <path d='M44.4 39h4.4v8.8H51V50h-6.6v-2.2h2.2v-6.6h-2.2z' />
          )) ||
          (value === 2 && (
            <path d='M43.1 40.1h1.1V39h6.6v1.1h1.1v4.4h-1.1v1.1h-5.5v2.2h6.6V50h-8.8v-5.5h1.1v-1.1h5.5v-2.2h-4.4v1.1h-2.2z' />
          )) ||
          (value === 3 && (
            <path d='M43.1 40.1h1.1V39h6.6v1.1h1.1v3.3h-1.1v2.2h1.1v3.3h-1.1V50h-6.6v-1.1h-1.1v-2.2h2.2v1.1h4.4v-2.2h-4.4v-2.2h4.4v-2.2h-4.4v1.1h-2.2z' />
          )) ||
          (value === 4 && (
            <path d='M43.1 39h2.2v4.4h4.4V39h2.2v11h-2.2v-4.4h-6.6z' />
          )) ||
          (value === 5 && (
            <path d='M42.9 39h8.8v2.2h-6.6v2.2h5.5v1.1h1.1v4.4h-1.1V50H44v-1.1h-1.1v-2.2h2.2v1.1h4.4v-2.2h-6.6z' />
          )) ||
          (value === 6 && (
            <path d='M43.1 40.1h1.1V39h6.6v1.1h1.1v2.2h-2.2v-1.1h-4.4v2.2h5.5v1.1h1.1v4.4h-1.1V50h-6.6v-1.1h-1.1v-8.8zm2.2 7.7h4.4v-2.2h-4.4v2.2z' />
          )) ||
          (value === 7 && (
            <path d='M42.8 40.1h1.1V39h6.6v1.1h1.1V50h-2.2v-8.8H45v3.3h-2.2z' />
          )) ||
          (value === 8 && (
            <path d='M43.1 40.1h1.1V39h6.6v1.1h1.1v3.3h-1.1v2.2h1.1v3.3h-1.1V50h-6.6v-1.1h-1.1v-3.3h1.1v-2.2h-1.1v-3.3zm2.2 7.7h4.4v-2.2h-4.4v2.2zm0-4.4h4.4v-2.2h-4.4v2.2z' />
          )) ||
          (value === 9 && (
            <path d='M43.1 40.1h1.1V39h6.6v1.1h1.1v8.8h-1.1V50h-6.6v-1.1h-1.1v-2.2h2.2v1.1h4.4v-2.2h-5.5v-1.1h-1.1v-4.4zm2.2 1.1v2.2h4.4v-2.2h-4.4z' />
          )) ||
          (typeof value === 'number' && value > 9 && (
            <path d='M39.3 43.5h2v-2h2v2h2v2h-2v2h-2v-2h-2v-2zm7.68-3h1v-1h6v1h1v8h-1v1h-6v-1h-1v-2h2v1h4v-2h-5v-1h-1v-4zm2 1v2h4v-2h-4z' />
          ))}
      </g>
    </svg>
  );
};

export default Badge;
