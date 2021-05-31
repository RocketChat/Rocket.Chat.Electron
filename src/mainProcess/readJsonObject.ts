import { promises as fsPromises } from 'fs';

export const readJsonObject = async (
  filePath: string,
  { discard }: { discard?: boolean } = {}
): Promise<Record<string, unknown>> => {
  try {
    const content = await fsPromises.readFile(filePath, 'utf8');
    const json = JSON.parse(content);

    if (discard) {
      await fsPromises.unlink(filePath);
    }

    return json && typeof json === 'object' && !Array.isArray(json) ? json : {};
  } catch (error) {
    return {};
  }
};
