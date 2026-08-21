import type { UserPresence } from '../../servers/common';

type PresenceDotProps = {
  presence: UserPresence;
};

const PRESENCE_COLORS: Record<UserPresence, string> = {
  online: '#2DE0A5',
  away: '#FFD21F',
  busy: '#F5455C',
  offline: '#9EA2A8',
};

const PresenceDot = ({ presence }: PresenceDotProps) => {
  const color = PRESENCE_COLORS[presence];
  const outline = '#FFFFFF';

  return (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='13 33 23 23'>
      <g fill={outline}>
        <circle cx='24.5' cy='44.5' r='11.5' />
      </g>
      {presence === 'offline' ? (
        <g fill={outline}>
          <circle
            cx='24.5'
            cy='44.5'
            r='8.5'
            fill='none'
            stroke={color}
            strokeWidth='3'
          />
        </g>
      ) : (
        <g fill={color}>
          <circle cx='24.5' cy='44.5' r='8.5' />
        </g>
      )}
    </svg>
  );
};

export default PresenceDot;
