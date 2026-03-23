import { ipcRenderer } from 'electron';
import { useEffect, useRef } from 'react';

import { ScreenSharePicker } from '../../screenSharing/screenSharePicker';

export const RootScreenSharePicker = () => {
  const setVisibleRef = useRef<((visible: boolean) => void) | null>(null);

  useEffect(() => {
    const handleOpen = () => {
      if (setVisibleRef.current) {
        setVisibleRef.current(true);
      }
    };

    ipcRenderer.on('screen-picker/open', handleOpen);

    return () => {
      ipcRenderer.removeListener('screen-picker/open', handleOpen);
    };
  }, []);

  return (
    <ScreenSharePicker
      onMounted={(setVisible) => {
        setVisibleRef.current = setVisible;
      }}
      responseChannel='screen-picker/source-responded'
      permissionChannel='screen-picker/screen-recording-is-permission-granted'
      openUrlChannel='screen-picker/open-url'
      includeTheme={false}
    />
  );
};
