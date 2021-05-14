export type WindowState = {
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
