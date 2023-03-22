import { clipboard } from 'electron';

export const writeTextToClipboard = (text: string): void => {
  clipboard.writeText(text);
};
