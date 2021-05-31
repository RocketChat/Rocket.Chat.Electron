import type { AddRepresentationOptions } from 'electron';

export type RootWindowIcon = {
  icon: Omit<AddRepresentationOptions, 'scaleFactor'>[];
  overlay?: Omit<AddRepresentationOptions, 'scaleFactor'>[];
};
