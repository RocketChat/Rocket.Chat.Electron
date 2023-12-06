import type React from 'react';
import { useEffect } from 'react';

type CustomThemeProps = {
  customTheme: string;
};

const CustomTheme: React.FC<CustomThemeProps> = ({ customTheme }) => {
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = customTheme;

    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, [customTheme]);

  return null;
};

export default CustomTheme;
