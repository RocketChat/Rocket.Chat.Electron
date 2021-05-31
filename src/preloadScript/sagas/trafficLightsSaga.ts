import { call } from '../../common/effects/call';
import { select } from '../../common/effects/select';
import { watch } from '../../common/effects/watch';
import { whenReady } from '../../rendererProcess/whenReady';

export function* trafficLightsSaga(): Generator {
  const platform = yield* select((state) => state.app.platform);
  if (platform !== 'darwin') {
    return;
  }

  yield* call(whenReady);

  const style =
    document.getElementById('sidebar-padding') ||
    document.createElement('style');
  style.id = 'sidebar-padding';
  document.head.append(style);

  yield* watch(
    (state) => state.servers.length > 0 && state.ui.sideBar.enabled,
    function* (sideBarVisible) {
      style.innerHTML = `
        .sidebar {
          padding-top: ${sideBarVisible ? 0 : '10px'} !important;
          transition: padding-top 230ms ease-in-out !important;
        }
      `;
    }
  );
}
