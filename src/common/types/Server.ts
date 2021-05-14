export type Server = {
  url: string;
  title?: string;
  badge?: '•' | number;
  favicon?: string | null;
  style?: {
    background: string | null;
    color: string | null;
  };
  lastPath?: string;
  failed?: boolean;
  webContentsId?: number;
};
