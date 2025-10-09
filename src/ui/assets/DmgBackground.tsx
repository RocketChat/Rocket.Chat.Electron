import { RocketChatLogo } from '../components/RocketChatLogo';

const DmgBackground = () => {
  const backgroundColor = '#b3ffd5ff';

  return (
    <svg viewBox='0 0 600 422' xmlns='http://www.w3.org/2000/svg'>
      <rect width='600' height='432' fill={backgroundColor} />
      <g transform='translate(200 0) scale(0.333)'>
        <RocketChatLogo />
      </g>
    </svg>
  );
};

export default DmgBackground;
