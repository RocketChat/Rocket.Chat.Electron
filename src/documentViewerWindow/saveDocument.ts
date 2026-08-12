import { promises as fs } from 'fs';
import path from 'path';

import type { BrowserWindow } from 'electron';
import { dialog, session } from 'electron';

import { getWebContentsByServerUrl } from '../ui/main/serverView';

export type SaveDocumentRequest = {
  url: string;
  partition: string;
  server: string;
  format: string;
};

export type SaveDocumentResult = {
  success: boolean;
  canceled?: boolean;
  error?: string;
};

const DEFAULT_EXTENSION: Record<string, string> = {
  markdown: '.md',
  pdf: '.pdf',
};

/**
 * What to call the file in the save dialog: the name it has on the server when
 * the URL carries one, and a plain default when it does not — a blob URL is
 * just an identifier.
 */
export const suggestFileName = (url: string, format: string): string => {
  const extension = DEFAULT_EXTENSION[format] ?? DEFAULT_EXTENSION.pdf;

  try {
    const name = path.basename(new URL(url).pathname);
    if (name && path.extname(name)) return name;
    if (name) return `${name}${extension}`;
  } catch {
    // Falls through to the default below.
  }

  return `document${extension}`;
};

/**
 * Reads a blob the server page created.
 *
 * Blob URLs resolve only in the renderer that registered them, so this has to
 * run in the workspace's own web contents rather than in the main process or in
 * the viewer's webview.
 */
const readBlobFromServer = async (
  url: string,
  server: string
): Promise<Buffer> => {
  const webContents = getWebContentsByServerUrl(server);

  if (!webContents) {
    throw new Error('The workspace that created this document is not open');
  }

  // Read with FileReader rather than a byte loop and btoa: this runs in the
  // reader's own workspace, and doing it by hand froze that window for the
  // length of the file while holding it three times over — the buffer, the
  // binary string and the base64. The engine's own encoder streams it.
  const dataUrl: string = await webContents.executeJavaScript(
    `(async () => {
      const response = await fetch(${JSON.stringify(url)});
      const blob = await response.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    })()`
  );

  return Buffer.from(String(dataUrl).split(',')[1] ?? '', 'base64');
};

const readDocument = async ({
  url,
  partition,
  server,
}: SaveDocumentRequest): Promise<Buffer> => {
  const { protocol } = new URL(url);

  if (protocol === 'blob:') {
    return readBlobFromServer(url, server);
  }

  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new Error(`Cannot download a ${protocol} document`);
  }

  // The workspace's own session, so an authenticated document downloads as the
  // signed-in user rather than as an anonymous request.
  const response = await session.fromPartition(partition).fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
};

export const saveDocument = async (
  browserWindow: BrowserWindow,
  request: SaveDocumentRequest
): Promise<SaveDocumentResult> => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(browserWindow, {
      defaultPath: suggestFileName(request.url, request.format),
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    await fs.writeFile(filePath, await readDocument(request));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
