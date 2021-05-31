import type { Certificate } from 'electron';

export type PersistableValues_0_0_0 = {
  currentServerUrl: string;
  currentView: 'add-new-server' | null;
  doCheckForUpdatesOnStartup: boolean;
  externalProtocols: Record<string, boolean>;
  isEachUpdatesSettingConfigurable: boolean;
  isMenuBarEnabled: boolean;
  isShowWindowOnUnreadChangedEnabled: boolean;
  isSideBarEnabled: boolean;
  isTrayIconEnabled: boolean;
  isUpdatingEnabled: boolean;
  rootWindowState: {
    focused: boolean;
    visible: boolean;
    maximized: boolean;
    minimized: boolean;
    fullscreen: boolean;
    normal: boolean;
    bounds: {
      x?: number;
      y?: number;
      width: number;
      height: number;
    };
  };
  servers: {
    url: string;
    version?: string;
    badge?: '•' | number;
    favicon?: string;
    style?: {
      background: string | null;
      color: string | null;
    };
    title?: string;
    lastPath?: string;
    failed?: boolean;
    webContentsId?: number;
  }[];
  skippedUpdateVersion: string | null;
  trustedCertificates: Record<string, Certificate['fingerprint']>;
};
