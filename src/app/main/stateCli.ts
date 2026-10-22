import fs from 'fs';
import path from 'path';

import { app } from 'electron';

import { logger } from '../../logging';
import { safeSelect, select } from '../../store';
import type { PersistableValues } from '../PersistableValues';
import { selectPersistableValues } from '../selectors';

export const getCommandLineSwitch = (
  switchName: string,
  argv: string[] = process.argv
): string | null => {
  const prefix = `--${switchName}=`;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith(prefix)) {
      return arg.slice(prefix.length).replace(/^['"]|['"]$/g, '');
    }
    if (arg === `--${switchName}`) {
      const nextArg = argv[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        return nextArg.replace(/^['"]|['"]$/g, '');
      }
    }
  }

  try {
    if (app?.commandLine?.hasSwitch?.(switchName)) {
      const val = app.commandLine.getSwitchValue(switchName);
      if (val) {
        return val.replace(/^['"]|['"]$/g, '');
      }
    }
  } catch {
    // app.commandLine may not be available in test/isolated environments
  }

  return null;
};

export const loadStateFromCli = async (
  customPath?: string
): Promise<Partial<PersistableValues>> => {
  const statePath = customPath ?? getCommandLineSwitch('load-state');
  if (!statePath) {
    return {};
  }

  try {
    const resolvedPath = path.resolve(process.cwd(), statePath);
    const content = await fs.promises.readFile(resolvedPath, 'utf8');
    const json = JSON.parse(content);
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      logger.info(
        `Loaded initial state from CLI --load-state: ${resolvedPath}`
      );
      return json as Partial<PersistableValues>;
    }
  } catch (error) {
    logger.error(
      `Failed to load state from CLI --load-state (${statePath}):`,
      error
    );
  }
  return {};
};

export const exportStateToCli = (customPath?: string): void => {
  const exportPath = customPath ?? getCommandLineSwitch('export-state');
  if (!exportPath) {
    return;
  }

  try {
    const resolvedPath = path.resolve(process.cwd(), exportPath);
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    const state = safeSelect
      ? safeSelect(selectPersistableValues)
      : select(selectPersistableValues);
    if (state) {
      fs.writeFileSync(resolvedPath, JSON.stringify(state, null, 2), 'utf8');
      logger.info(
        `Exported persisted state to CLI --export-state: ${resolvedPath}`
      );
    }
  } catch (error) {
    logger.error(
      `Failed to export state to CLI --export-state (${exportPath}):`,
      error
    );
  }
};
