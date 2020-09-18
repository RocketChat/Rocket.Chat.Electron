import { AddRepresentationOptions } from 'electron';

import { Server } from '../servers/common';

export type IconRepresentation = Omit<AddRepresentationOptions, 'scaleFactor'>;

export type RootWindowIcon = {
  icon: IconRepresentation[];
  overlay?: IconRepresentation[];
}

export type WindowState = {
  focused: boolean;
  visible: boolean;
  maximized: boolean;
  minimized: boolean;
  fullscreen: boolean;
  normal: boolean;
  bounds: {
    x: number | undefined,
    y: number | undefined,
    width: number,
    height: number,
  }
};

export type PreloadInfo = {
  url: Server['url'];
};
