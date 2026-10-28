import { rm } from 'node:fs/promises';

// The index database file and the SQLite side files that it can have. The
// main process removes them with a rejected key file, so this module must not
// import the native search module.
export const INDEX_DB_FILE_NAME = 'index.db';

const INDEX_FILE_SUFFIXES = ['', '-wal', '-shm', '-journal'];

export const removeIndexFiles = async (file: string): Promise<void> => {
  await Promise.all(
    INDEX_FILE_SUFFIXES.map((suffix) => rm(`${file}${suffix}`, { force: true }))
  );
};
