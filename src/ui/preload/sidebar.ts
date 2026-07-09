import { watch } from '../../store';
import type { RootState } from '../../store/rootReducer';

const selectIsTrafficLightsCovered = ({
  servers,
  navigationLayout,
}: RootState): boolean => navigationLayout === 'tabs' || servers.length > 0;

export const handleTrafficLightsSpacing = (): void => {
  if (process.platform !== 'darwin') {
    return;
  }

  const style =
    document.getElementById('sidebar-padding') ||
    document.createElement('style');
  style.id = 'sidebar-padding';
  document.head.append(style);

  watch(selectIsTrafficLightsCovered, (isTrafficLightsCovered) => {
    style.innerHTML = `
      .sidebar {
        padding-top: ${isTrafficLightsCovered ? 0 : '10px'} !important;
        transition: padding-top 230ms ease-in-out !important;
      }
    `;
  });
};
