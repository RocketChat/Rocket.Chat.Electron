import { AddRepresentationOptions } from 'electron';

export type IconRepresentation = Omit<AddRepresentationOptions, 'scaleFactor'>;

export type RootWindowIcon = {
  icon: IconRepresentation[];
  overlay?: IconRepresentation[];
};

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
