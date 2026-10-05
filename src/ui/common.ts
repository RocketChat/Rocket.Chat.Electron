import type { AddRepresentationOptions } from 'electron';

export type IconRepresentation = Omit<AddRepresentationOptions, 'scaleFactor'>;

export type NavigationLayout = 'tabs' | 'sidebar' | 'hidden';

export type UiPreviewHistoryEntry = {
  // What the Settings field takes to load this build again: `develop`, a PR number or a bundle URL.
  input: string;
  label: string;
  // Registry builds only: the layer digest, commit and publish date last read from the manifest.
  digest?: string;
  revision?: string;
  createdAt?: string;
};

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
