// src/types/global.d.ts

export {};

declare global {
  interface Window {
    electronAPI: {
      openChatPopup: (orogin: string, chatPath: string) => void;
    };
  }
}
